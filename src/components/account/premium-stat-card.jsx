import { getLocale, getTranslations } from "next-intl/server";
import { Gift, Sparkles } from "lucide-react";
import { StatCard } from "@/components/account/stat-card";
import { timeZone } from "@/i18n/routing";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compact date for narrow dashboard tiles (e.g. "Aug 25").
 * @param {Date} date
 * @param {string} locale
 */
function formatShortDate(date, locale) {
  const intlLocale = locale === "fa" ? "fa-IR" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

/**
 * Whole days remaining until `periodEnd` (0 if already past).
 * @param {Date} periodEnd
 */
function daysRemaining(periodEnd) {
  return Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / DAY_MS));
}

/**
 * Dashboard stat tile for an active Premium membership.
 * Big number = days left; subtitle = gift / renew / end.
 *
 * @param {object} props
 * @param {object} props.user
 * @param {string} props.href
 */
export async function PremiumStatCard({ user, href }) {
  const t = await getTranslations("premium");
  const locale = await getLocale();
  const periodEnd = user?.premiumPeriodEnd ? new Date(user.premiumPeriodEnd) : null;
  const isComplimentary = user?.premiumSource === "admin";
  const isStripe = user?.premiumSource === "stripe";
  const pastDue = user?.premiumStatus === "past_due";

  /** @type {string | number} */
  let value;
  /** @type {string | undefined} */
  let suffix;
  /** @type {string} */
  let label;

  if (pastDue) {
    value = 0;
    suffix = t("active.statDaysSuffix");
    label = t("active.pastDue");
  } else if (!periodEnd) {
    value = "∞";
    label = isComplimentary
      ? t("active.statGiftNoExpiry")
      : t("active.noExpiry");
  } else {
    const when = formatShortDate(periodEnd, locale);
    value = daysRemaining(periodEnd);
    suffix = t("active.statDaysSuffix");
    if (isComplimentary) {
      label = t("active.statGiftEnds", { date: when });
    } else if (isStripe) {
      label = t("active.statRenews", { date: when });
    } else {
      label = t("active.statEnds", { date: when });
    }
  }

  const Icon = isComplimentary ? Gift : Sparkles;

  return (
    <StatCard
      href={href}
      icon={Icon}
      value={value}
      suffix={suffix}
      label={label}
      className="border-amber-500/25 bg-amber-500/[0.06] hover:border-amber-500/40"
      iconClassName="bg-amber-500/15 [&_svg]:text-amber-700 dark:[&_svg]:text-amber-300"
      valueClassName="text-amber-900 dark:text-amber-100"
    />
  );
}
