"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarRange,
  Gift,
  HeartHandshake,
  Megaphone,
  QrCode,
  Shield,
  Sparkles,
  Loader2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import {
  startPremiumCheckout,
  openPremiumBillingPortal,
} from "@/lib/actions/premium";
import {
  isPremium,
  isPhoneVerified,
  showsVerifiedBadge,
} from "@/lib/premium/entitlements";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Premium upsell / manage panel for the account area.
 *
 * @param {object} props
 * @param {object} props.user
 * @param {object} props.settings
 * @param {boolean} [props.compact]
 * @param {string} [props.settingsPath] — link target for phone verify hint
 */
export function PremiumPanel({ user, settings, compact = false, settingsPath = "" }) {
  const t = useTranslations("premium");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(/** @type {null | string} */ (null));

  const premium = isPremium(user);
  const enabled = settings?.premiumEnabled !== false;
  const canManageBilling =
    Boolean(user?.stripeCustomerId) && user?.premiumSource === "stripe";
  const isComplimentary = user?.premiumSource === "admin";
  const phoneVerified = isPhoneVerified(user);
  const publicBadge = showsVerifiedBadge(user);

  const priceCents = settings?.premiumPriceCents ?? 2000;
  const currency = (settings?.premiumCurrency || "usd").toUpperCase();
  const priceLabel = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceCents / 100);

  const freeDay = settings?.maxListingsPerDay ?? 3;
  const premiumDay = settings?.premiumMaxListingsPerDay ?? 5;
  const premiumMonth = settings?.premiumMaxListingsPerMonth ?? 25;

  function run(action, key) {
    setBusy(key);
    startTransition(async () => {
      try {
        const result = await action(locale);
        if (result?.error) {
          const messageKey = `errors.${result.error}`;
          toast.error(
            [
              "generic",
              "user_not_found",
              "already_premium",
              "billing_unavailable",
              "premium_disabled",
              "billing_misconfigured",
              "checkout_failed",
              "no_customer",
            ].includes(result.error)
              ? t(messageKey)
              : t("errors.generic")
          );
          return;
        }
        if (result?.url) {
          window.location.href = result.url;
          return;
        }
        toast.error(t("errors.generic"));
      } catch {
        toast.error(t("errors.generic"));
      } finally {
        setBusy(null);
      }
    });
  }

  if (premium) {
    return (
      <ActivePremiumPanel
        compact={compact}
        user={user}
        locale={locale}
        t={t}
        freeDay={freeDay}
        premiumDay={premiumDay}
        premiumMonth={premiumMonth}
        isComplimentary={isComplimentary}
        canManageBilling={canManageBilling}
        phoneVerified={phoneVerified}
        publicBadge={publicBadge}
        settingsPath={settingsPath}
        pending={pending}
        busy={busy}
        onManageBilling={() => run(openPremiumBillingPortal, "portal")}
      />
    );
  }

  if (!enabled) return null;

  return (
    <UpsellPremiumPanel
      compact={compact}
      t={t}
      freeDay={freeDay}
      premiumDay={premiumDay}
      priceLabel={priceLabel}
      pending={pending}
      busy={busy}
      onCheckout={() => run(startPremiumCheckout, "checkout")}
    />
  );
}

function ActivePremiumPanel({
  compact,
  user,
  locale,
  t,
  freeDay,
  premiumDay,
  premiumMonth,
  isComplimentary,
  canManageBilling,
  phoneVerified,
  publicBadge,
  settingsPath,
  pending,
  busy,
  onManageBilling,
}) {
  const startedAt = user?.premiumStartedAt ? new Date(user.premiumStartedAt) : null;
  const periodEnd = user?.premiumPeriodEnd ? new Date(user.premiumPeriodEnd) : null;
  const pastDue = user?.premiumStatus === "past_due";

  if (compact) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-sky-500/10 p-5">
        <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <VerifiedBadge size="sm" showLabel label={t("active.badge")} />
            {isComplimentary ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Gift className="size-3" />
                {t("active.complimentary")}
              </Badge>
            ) : null}
          </div>
          <p className="font-semibold">{t("active.title")}</p>
          <MembershipDates
            t={t}
            locale={locale}
            startedAt={startedAt}
            periodEnd={periodEnd}
            compact
          />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-emerald-500/10 p-6 sm:p-10">
      <div className="pointer-events-none absolute -left-12 top-0 size-48 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-10 size-56 rounded-full bg-sky-400/15 blur-3xl" />

      <div className="relative space-y-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <VerifiedBadge size="md" showLabel label={t("active.badge")} />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  {t("active.eyebrow")}
                </span>
                {isComplimentary ? (
                  <Badge
                    variant="outline"
                    className="border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                  >
                    <Gift className="me-1 size-3" />
                    {t("active.complimentary")}
                  </Badge>
                ) : null}
                {pastDue ? (
                  <Badge variant="destructive">{t("active.pastDue")}</Badge>
                ) : null}
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {t("active.heroTitle")}
              </h2>
              <p className="max-w-prose text-pretty text-muted-foreground">
                {t("active.heroSubtitle")}
              </p>
            </div>

            <MembershipDates
              t={t}
              locale={locale}
              startedAt={startedAt}
              periodEnd={periodEnd}
            />

            {!phoneVerified && settingsPath ? (
              <div className="flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-4">
                <Smartphone className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{t("active.verifyPhoneTitle")}</p>
                  <p className="text-muted-foreground">{t("active.verifyPhoneBody")}</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={settingsPath}>{t("active.verifyPhoneCta")}</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {canManageBilling ? (
              <Button variant="outline" disabled={pending} onClick={onManageBilling}>
                {busy === "portal" ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("active.manage")}
              </Button>
            ) : null}
          </div>

          <MemberCard
            t={t}
            freeDay={freeDay}
            premiumDay={premiumDay}
            premiumMonth={premiumMonth}
            publicBadge={publicBadge}
            phoneVerified={phoneVerified}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("active.benefitsHeading")}
          </h3>
          <BenefitsGrid t={t} freeDay={freeDay} premiumDay={premiumDay} />
        </div>
      </div>
    </section>
  );
}

function UpsellPremiumPanel({
  compact,
  t,
  freeDay,
  premiumDay,
  priceLabel,
  pending,
  busy,
  onCheckout,
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-500/10 via-background to-amber-500/15",
        compact ? "p-5" : "p-6 sm:p-10"
      )}
    >
      <div className="pointer-events-none absolute -left-10 top-0 size-40 animate-pulse rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-8 size-48 rounded-full bg-amber-400/25 blur-3xl" />

      <div className={cn("relative", compact ? "space-y-5" : "space-y-8")}>
        <div
          className={cn(
            "grid gap-8",
            !compact && "lg:grid-cols-[1.2fr_0.8fr] lg:items-center"
          )}
        >
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
              <Sparkles className="size-3.5" />
              {t("upsell.eyebrow")}
            </div>
            <h2
              className={cn(
                "text-balance font-bold tracking-tight",
                compact ? "text-xl" : "text-3xl sm:text-4xl"
              )}
            >
              {t("upsell.title")}
            </h2>
            <p className="max-w-prose text-pretty text-muted-foreground">{t("upsell.subtitle")}</p>

            {compact ? (
              <BenefitsGrid t={t} freeDay={freeDay} premiumDay={premiumDay} />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
                disabled={pending}
                onClick={onCheckout}
              >
                {busy === "checkout" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {t("upsell.cta", { price: priceLabel })}
              </Button>
              <p className="text-xs text-muted-foreground">{t("upsell.billingHint")}</p>
            </div>
          </div>

          {!compact ? (
            <PreviewCard t={t} freeDay={freeDay} premiumDay={premiumDay} priceLabel={priceLabel} />
          ) : null}
        </div>

        {!compact ? (
          <BenefitsGrid t={t} freeDay={freeDay} premiumDay={premiumDay} />
        ) : null}
      </div>
    </section>
  );
}

function BenefitsGrid({ t, freeDay, premiumDay }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:gap-4">
      <Benefit
        icon={BadgeCheck}
        title={t("benefits.verified.title")}
        body={t("benefits.verified.body")}
      />
      <Benefit
        icon={Megaphone}
        title={t("benefits.rate.title", { from: freeDay, to: premiumDay })}
        body={t("benefits.rate.body", { from: freeDay, to: premiumDay })}
      />
      <Benefit
        icon={Shield}
        title={t("benefits.trust.title")}
        body={t("benefits.trust.body")}
      />
      <Benefit
        icon={QrCode}
        title={t("benefits.collar.title")}
        body={t("benefits.collar.body")}
      />
      <Benefit
        icon={HeartHandshake}
        title={t("benefits.support.title")}
        body={t("benefits.support.body")}
      />
    </ul>
  );
}

function MembershipDates({ t, locale, startedAt, periodEnd, compact = false }) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border bg-background/70 backdrop-blur",
        compact ? "p-3 sm:grid-cols-2" : "p-4 sm:grid-cols-2"
      )}
    >
      <div className="flex gap-3">
        <CalendarRange className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("active.memberSince")}
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {startedAt ? formatDate(startedAt, locale) : t("active.dateUnknown")}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <CalendarRange className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("active.validUntil")}
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {periodEnd ? formatDate(periodEnd, locale) : t("active.noExpiry")}
          </p>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  t,
  freeDay,
  premiumDay,
  premiumMonth,
  publicBadge,
  phoneVerified,
}) {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:ms-auto">
      <div className="absolute inset-0 rotate-2 rounded-3xl bg-gradient-to-br from-amber-500/25 to-emerald-500/30 blur-sm" />
      <div className="relative -rotate-1 rounded-3xl border bg-card/95 p-6 shadow-lg backdrop-blur transition-transform duration-500 hover:rotate-0">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("memberCard.label")}
          </span>
          {publicBadge ? (
            <VerifiedBadge size="sm" showLabel label={t("preview.badge")} />
          ) : phoneVerified ? (
            <Badge variant="outline" className="text-xs">
              {t("memberCard.phoneVerified")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {t("memberCard.phonePending")}
            </Badge>
          )}
        </div>

        <p className="text-lg font-semibold">{t("memberCard.title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("memberCard.subtitle")}</p>

        <div className="mt-6 space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground line-through decoration-muted-foreground/50">
            <span>{t("preview.free")}</span>
            <span>{t("preview.perDay", { count: freeDay })}</span>
          </div>
          <div className="flex justify-between font-medium text-amber-700 dark:text-amber-300">
            <span>{t("preview.premium")}</span>
            <span className="font-semibold">{t("preview.perDay", { count: premiumDay })}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("memberCard.monthlyCap")}</span>
            <span>{t("memberCard.perMonth", { count: premiumMonth })}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("memberCard.thankYou")}
        </p>
      </div>
    </div>
  );
}

function PreviewCard({ t, freeDay, premiumDay, priceLabel }) {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-0 -rotate-3 rounded-3xl bg-gradient-to-br from-sky-500/30 to-amber-500/40 blur-sm" />
      <div className="relative rotate-1 rounded-3xl border bg-card/90 p-6 shadow-lg backdrop-blur transition-transform duration-500 hover:rotate-0">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{t("preview.label")}</span>
          <VerifiedBadge size="sm" showLabel label={t("preview.badge")} />
        </div>
        <p className="text-lg font-semibold">{t("preview.name")}</p>
        <p className="mt-1 text-sm text-muted-foreground">@{t("preview.handle")}</p>
        <div className="mt-6 space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
          <div className="flex justify-between">
            <span>{t("preview.free")}</span>
            <span className="font-medium">{t("preview.perDay", { count: freeDay })}</span>
          </div>
          <div className="flex justify-between text-amber-700 dark:text-amber-300">
            <span className="font-medium">{t("preview.premium")}</span>
            <span className="font-semibold">{t("preview.perDay", { count: premiumDay })}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-2xl font-bold tracking-tight">
          {priceLabel}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {t("preview.perYear")}
          </span>
        </p>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, title, body }) {
  return (
    <li className="flex gap-3.5 rounded-xl border bg-background/60 p-3.5 backdrop-blur sm:p-4 lg:gap-4 lg:p-5">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 lg:size-10">
        <Icon className="size-4 lg:size-[1.125rem]" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug lg:text-[0.9375rem]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground lg:mt-1 lg:text-sm">
          {body}
        </p>
      </div>
    </li>
  );
}
