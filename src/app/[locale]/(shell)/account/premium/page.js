import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getAuthUserById } from "@/lib/auth/users";
import { getAppSettings } from "@/lib/services/settings";
import { isPremium } from "@/lib/premium/entitlements";
import { PremiumPanel } from "@/components/account/premium-panel";
import { PremiumPurchaseBeacon } from "@/components/analytics/premium-purchase-beacon";
import { toPlainObject } from "@/lib/utils";

export default async function AccountPremiumPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("premium");
  const session = await getSession();
  const [user, settings] = await Promise.all([
    getAuthUserById(session.user.id),
    getAppSettings(),
  ]);

  const checkout = typeof query?.checkout === "string" ? query.checkout : null;
  const premium = isPremium(user);
  const plainUser = toPlainObject(user || session.user);
  const plainSettings = toPlainObject(settings);
  const priceCents = plainSettings?.premiumPriceCents ?? 2000;
  const currency = (plainSettings?.premiumCurrency || "usd").toUpperCase();

  return (
    <div className="space-y-6">
      <PremiumPurchaseBeacon
        premium={premium}
        checkout={checkout}
        currency={currency}
        value={priceCents / 100}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {premium ? t("page.subtitleMember") : t("page.subtitle")}
        </p>
      </div>

      {checkout === "success" && premium ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          {t("page.checkoutSuccess")}
        </p>
      ) : null}
      {checkout === "success" && !premium ? (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
          {t("page.checkoutPending")}
        </p>
      ) : null}
      {checkout === "canceled" ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("page.checkoutCanceled")}
        </p>
      ) : null}

      <PremiumPanel
        user={plainUser}
        settings={plainSettings}
        settingsPath={`/${locale}/account/settings`}
      />
    </div>
  );
}
