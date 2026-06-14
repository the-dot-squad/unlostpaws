import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB, getMongoDb } from "@/config/db";
import { Listing } from "@/models/listing";
import { searchListings } from "@/lib/listings/search";
import { HeroSection } from "@/components/marketing/hero-section";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { FeaturesSection } from "@/components/marketing/features-section";
import { RecentAlertsSection } from "@/components/marketing/recent-alerts-section";
import { LISTING_TYPES, PET_TYPES, PROCESSING_STATUSES } from "@/config/constants/enums";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getHomepageJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const tSeo = await getTranslations({ locale, namespace: "seo" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const siteName = tCommon("appName");

  return buildPageMetadata({
    locale,
    title: {
      absolute: `${siteName} — ${tSeo("homeTitle")}`,
    },
    description: tSeo("homeDescription"),
  });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  await connectDB();

  const db = await getMongoDb();

  const [missingCount, foundCount, surrenderCount, reunitedCount, userCount, recentResult] =
    await Promise.all([
      Listing.countDocuments({ type: "missing", status: "active" }),
      Listing.countDocuments({ type: "found", status: "active" }),
      Listing.countDocuments({ type: "surrender", status: "active" }),
      Listing.countDocuments({ status: "resolved" }),
      db.collection("user").countDocuments({ banned: { $ne: true } }),
      searchListings({ limit: 8 }),
    ]);

  const recentListings = recentResult.listings;

  const typeLabels = Object.fromEntries(
    LISTING_TYPES.map((type) => [type, t(`listingTypes.${type}`)])
  );
  const petTypeLabels = Object.fromEntries(
    PET_TYPES.map((pt) => [pt, t(`petTypes.${pt}`)])
  );
  const processingLabels = Object.fromEntries(
    PROCESSING_STATUSES.map((s) => [s, t(`listings.processing.${s}`)])
  );

  const features = [
    {
      id: "search",
      title: t("home.features.search.title"),
      description: t("home.features.search.description"),
    },
    {
      id: "matching",
      title: t("home.features.matching.title"),
      description: t("home.features.matching.description"),
    },
    {
      id: "map",
      title: t("home.features.map.title"),
      description: t("home.features.map.description"),
    },
    {
      id: "alerts",
      title: t("home.features.alerts.title"),
      description: t("home.features.alerts.description"),
    },
  ];

  const jsonLd = getHomepageJsonLd(locale);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <HeroSection
        locale={locale}
        title={t("home.heroTitle")}
        subtitle={t("home.heroSubtitle")}
        ctaReport={t("home.ctaReport")}
        ctaBrowse={t("home.ctaBrowse")}
      />

      <StatsStrip
        title={t("home.statsTitle")}
        subtitle={t("home.statsSubtitle")}
        stats={[
          { kind: "missing", value: missingCount, label: t("home.statsMissing") },
          { kind: "found", value: foundCount, label: t("home.statsFound") },
          { kind: "surrender", value: surrenderCount, label: t("home.statsSurrender") },
          { kind: "reunited", value: reunitedCount, label: t("home.statsReunited") },
          { kind: "users", value: userCount, label: t("home.statsUsers") },
        ]}
      />

      <FeaturesSection
        locale={locale}
        title={t("home.featuresTitle")}
        subtitle={t("home.featuresSubtitle")}
        features={features}
        about={{
          title: t("home.features.about.title"),
          description: t("home.features.about.description"),
          linkLabel: t("home.features.about.link"),
          href: "/about",
        }}
      />

      <RecentAlertsSection
        locale={locale}
        title={t("home.recentAlerts.title")}
        subtitle={t("home.recentAlerts.subtitle")}
        viewAllLabel={t("home.recentAlerts.viewAll")}
        emptyTitle={t("home.recentAlerts.emptyTitle")}
        emptyDescription={t("home.recentAlerts.emptyDescription")}
        emptyActionLabel={t("home.recentAlerts.emptyAction")}
        listings={recentListings}
        typeLabels={typeLabels}
        petTypeLabels={petTypeLabels}
        processingLabels={processingLabels}
      />
    </div>
  );
}
