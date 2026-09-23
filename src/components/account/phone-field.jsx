"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { BadgeCheck, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  startPhoneVerification,
  confirmPhoneVerification,
} from "@/lib/actions/phone";
import {
  isPhoneVerified,
  isPremium,
  phoneChangeAvailableAt,
} from "@/lib/premium/entitlements";
import { formatPhoneDisplay } from "@/lib/validation";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCountryName } from "@/config/countries";

const RESEND_SECONDS = 120;

/**
 * @param {string | null | undefined} e164
 * @param {string} fallbackCountry
 */
function splitE164(e164, fallbackCountry = "US") {
  if (!e164) {
    return { country: fallbackCountry, national: "" };
  }
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return { country: fallbackCountry, national: e164 };
  return {
    country: parsed.country || fallbackCountry,
    national: parsed.nationalNumber || "",
  };
}

/**
 * @param {string} country
 * @param {string} national
 */
function toE164(country, national) {
  const digits = String(national || "").replace(/\D/g, "");
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, country);
  if (parsed?.isValid()) return parsed.format("E.164");
  try {
    const withPlus = parsePhoneNumberFromString(
      `+${getCountryCallingCode(country)}${digits}`
    );
    if (withPlus?.isValid()) return withPlus.format("E.164");
  } catch {
    /* ignore */
  }
  return "";
}

function DialCodeSelect({ value, onChange, id }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    return getCountries()
      .map((code) => ({
        code,
        dial: `+${getCountryCallingCode(code)}`,
        name: getCountryName(code, locale) || code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.dial.includes(q)
    );
  }, [options, query]);

  const selected = options.find((o) => o.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[7.5rem] shrink-0 justify-between px-2 font-mono text-sm"
        >
          <span>{selected ? selected.dial : "+"}</span>
          <ChevronsUpDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="mb-2 h-8"
        />
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((o) => (
            <button
              key={o.code}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                o.code === value && "bg-accent"
              )}
              onClick={() => {
                onChange(o.code);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="w-12 font-mono text-xs text-muted-foreground">{o.dial}</span>
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              {o.code === value ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Profile phone field with country dial picker and Premium OTP verification.
 *
 * @param {object} props
 * @param {object} props.user
 * @param {string} props.value — E.164 or empty (controlled from parent for save)
 * @param {(e164: string) => void} props.onChange
 */
export function PhoneField({ user, value, onChange }) {
  const t = useTranslations("account.phoneVerify");
  const locale = useLocale();
  const premium = isPremium(user);
  const verified = isPhoneVerified(user);
  const changeAvailableAt = phoneChangeAvailableAt(user);

  const defaultCountry = (user.country || "US").toUpperCase();
  const initial = splitE164(value || user.phone, defaultCountry);
  const [country, setCountry] = useState(initial.country);
  const [national, setNational] = useState(initial.national);
  const [changing, setChanging] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(/** @type {null | string} */ (null));
  const [retryAfterSec, setRetryAfterSec] = useState(0);
  const [resendsRemaining, setResendsRemaining] = useState(1);

  const composed = toE164(country, national);
  const displaySaved = formatPhoneDisplay(user.phone) || user.phone || "";

  function setNationalAndSync(nextNational, nextCountry = country) {
    setNational(nextNational);
    onChange(toE164(nextCountry, nextNational));
  }

  useEffect(() => {
    if (retryAfterSec <= 0) return undefined;
    const id = window.setTimeout(() => {
      setRetryAfterSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [retryAfterSec]);

  function errorMessage(error, extra) {
    if (!error) return t("errors.generic");
    if (error === "phone_change_cooldown" && extra?.availableAt) {
      return t("errors.phone_change_cooldown", {
        date: formatDate(extra.availableAt, locale),
      });
    }
    const known = [
      "invalid_phone",
      "premium_required",
      "already_verified",
      "phone_already_verified",
      "phone_change_cooldown",
      "otp_daily_limit",
      "otp_resend_wait",
      "otp_resend_exhausted",
      "otp_not_started",
      "otp_invalid",
      "otp_expired",
      "invalid_code",
      "verify_unavailable",
      "verify_send_failed",
      "verify_check_failed",
    ];
    return known.includes(error) ? t(`errors.${error}`) : t("errors.generic");
  }

  async function handleSend() {
    if (!composed) {
      toast.error(t("errors.invalid_phone"));
      return;
    }
    setBusy("send");
    const result = await startPhoneVerification({ phone: composed });
    setBusy(null);
    if (result?.ok) {
      setOtpOpen(true);
      setRetryAfterSec(result.retryAfterSec ?? RESEND_SECONDS);
      setResendsRemaining(result.resendsRemaining ?? 0);
      toast.success(t("codeSent"));
      return;
    }
    if (result?.error === "otp_resend_wait" && result.retryAfterSec) {
      setRetryAfterSec(result.retryAfterSec);
    }
    toast.error(errorMessage(result?.error, result));
  }

  async function handleConfirm() {
    if (!composed || !code.trim()) {
      toast.error(t("errors.invalid_code"));
      return;
    }
    setBusy("confirm");
    const result = await confirmPhoneVerification({ phone: composed, code: code.trim() });
    setBusy(null);
    if (result?.success) {
      toast.success(t("verifiedSuccess"));
      setOtpOpen(false);
      setChanging(false);
      setCode("");
      window.location.reload();
      return;
    }
    toast.error(errorMessage(result?.error, result));
  }

  function startChange() {
    if (changeAvailableAt) {
      toast.error(
        errorMessage("phone_change_cooldown", {
          availableAt: changeAvailableAt.toISOString(),
        })
      );
      return;
    }
    setChanging(true);
    setOtpOpen(false);
    setCode("");
    setNational("");
    onChange("");
  }

  const showEditor =
    !premium ||
    !verified ||
    changing ||
    !user.phone;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="phone-national">{t("label")}</Label>
        {verified ? (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            <BadgeCheck
              className="size-3.5 shrink-0 fill-emerald-500/20 text-emerald-700 dark:fill-emerald-400/20 dark:text-emerald-300"
              aria-hidden="true"
            />
            {t("statusVerified")}
          </Badge>
        ) : (
          <Badge variant="outline">{t("statusUnverified")}</Badge>
        )}
      </div>

      {premium && verified && !changing ? (
        <div className="space-y-2">
          <Input value={displaySaved} disabled className="bg-muted/50 font-mono text-sm" />
          <p className="text-[11px] leading-snug text-muted-foreground">{t("verifiedHint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={startChange}>
              {t("changeNumber")}
            </Button>
            {changeAvailableAt ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("changeCooldown", { date: formatDate(changeAvailableAt, locale) })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showEditor ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <DialCodeSelect
              id="phone-country"
              value={country}
              onChange={(code) => {
                setCountry(code);
                const next = new AsYouType(code);
                const formatted = next.input(national.replace(/\D/g, ""));
                setNationalAndSync(formatted, code);
              }}
            />
            <Input
              id="phone-national"
              inputMode="tel"
              autoComplete="tel-national"
              value={national}
              onChange={(e) => {
                const formatter = new AsYouType(country);
                setNationalAndSync(formatter.input(e.target.value));
              }}
              placeholder={t("nationalPlaceholder")}
              className="font-mono text-sm"
            />
          </div>

          {!premium ? (
            <p className="text-[11px] leading-snug text-muted-foreground">{t("nonPremiumHint")}</p>
          ) : (
            <p className="text-[11px] leading-snug text-muted-foreground">
              {changing ? t("changeHint") : t("verifyHint")}
            </p>
          )}

          {premium ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              {!otpOpen ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSend}
                  disabled={Boolean(busy) || !composed}
                >
                  {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("sendCode")}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone-otp">{t("codeLabel")}</Label>
                    <Input
                      id="phone-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="123456"
                      className="max-w-[12rem] font-mono tracking-widest"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirm}
                      disabled={Boolean(busy) || code.length < 4}
                    >
                      {busy === "confirm" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      {t("confirmCode")}
                    </Button>
                    {resendsRemaining > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleSend}
                        disabled={Boolean(busy) || retryAfterSec > 0}
                      >
                        {busy === "send" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {retryAfterSec > 0
                          ? t("resendIn", { seconds: retryAfterSec })
                          : t("resend")}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("resendExhausted")}</p>
                    )}
                    {changing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setChanging(false);
                          setOtpOpen(false);
                          setCode("");
                          const back = splitE164(user.phone, defaultCountry);
                          setCountry(back.country);
                          setNational(back.national);
                          onChange(user.phone || "");
                        }}
                      >
                        {t("cancelChange")}
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
