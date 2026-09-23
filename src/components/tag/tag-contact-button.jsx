"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, PawPrint, Phone, ShieldCheck } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/validation";
import { TurnstileChallenge } from "@/components/security/turnstile-challenge";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { revealTagContactAction } from "@/lib/actions/owned-pets";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

const CONTACT_ERROR_KEYS = {
  captcha_required: "captchaRequired",
  captcha_failed: "captchaFailed",
  captcha_unavailable: "captchaUnavailable",
  captcha_expired: "captchaExpired",
  not_found: "notFound",
  self_contact: "selfContact",
  contact_disabled: "unavailable",
  collar_inactive: "inactive",
};

/**
 * Turnstile-gated contact reveal for the public Digital Collar page.
 * After reveal, finders use mailto: / tel: on their device.
 */
export function TagContactButton({ publicId }) {
  const t = useTranslations("tag");
  const turnstileRef = useRef(null);
  const pendingRunRef = useRef(false);

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const isBusy = loading || verifying;

  async function fetchContact(token) {
    setLoading(true);
    setError(null);

    try {
      const result = await revealTagContactAction(publicId, token);

      if (result.error) {
        const key = CONTACT_ERROR_KEYS[result.error] ?? "generic";
        setError(t(`contactErrors.${key}`));
        turnstileRef.current?.reset();
        return;
      }

      setContact(result.contact);
      trackEvent(ANALYTICS_EVENTS.TAG_CONTACT_REVEAL, { tag_id: publicId });
    } catch {
      setError(t("contactErrors.generic"));
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }

  function runChallenge() {
    if (turnstileRef.current?.isReady()) {
      pendingRunRef.current = false;
      turnstileRef.current.run();
    }
  }

  function startReveal() {
    setError(null);
    setVerifying(true);
    pendingRunRef.current = true;
    runChallenge();
  }

  function handleWidgetLoad() {
    if (pendingRunRef.current) runChallenge();
  }

  function handleCaptchaSuccess(token) {
    fetchContact(token);
  }

  function handleCaptchaExpire() {
    setVerifying(false);
    setError(t("contactErrors.captchaExpired"));
  }

  function handleCaptchaError() {
    setVerifying(false);
    setError(t("contactErrors.captchaFailed"));
    turnstileRef.current?.reset();
  }

  if (contact) {
    return (
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          {t("contactRevealed")}
        </p>
        <div className="space-y-2">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}?subject=${encodeURIComponent(t("emailSubject"))}`}
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              {contact.email}
            </a>
          ) : null}
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {formatPhoneDisplay(contact.phone)}
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <p className="font-medium">{t("foundTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("foundHint")}</p>

      <Button type="button" className="w-full sm:w-auto" onClick={startReveal} disabled={isBusy} aria-busy={isBusy}>
        {isBusy ? (
          <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
        ) : (
          <PawPrint className="me-2 size-4" aria-hidden />
        )}
        {loading ? t("contactLoading") : verifying ? t("contactVerifying") : t("foundCta")}
      </Button>

      <TurnstileChallenge
        ref={turnstileRef}
        action={TURNSTILE_ACTIONS.TAG_CONTACT}
        onSuccess={handleCaptchaSuccess}
        onError={handleCaptchaError}
        onExpire={handleCaptchaExpire}
        onLoad={handleWidgetLoad}
        className={verifying ? "mt-3" : "sr-only"}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
