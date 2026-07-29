import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getAccountDashboardData } from "@/lib/intelligence/matching/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/account/stat-card";
import { MatchListingSummary } from "@/components/account/match-listing-summary";
import { FileText, Heart, GitCompare, Plus } from "lucide-react";

export default async function AccountPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();
  const prefix = `/${locale}`;
  const accountPrefix = `${prefix}/account`;

  const { listingsCount, petsCount, pendingMatches, matchGroups } = await getAccountDashboardData(
    session.user.id
  );

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("account.welcome", { name: session.user.name })}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("account.dashboardSubtitle")}</p>
        </div>
        <Button asChild>
          <Link href={`${prefix}/listings/new`}>
            <Plus className="size-4" />
            {t("nav.createListing")}
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("nav.myListings")}
          value={listingsCount}
          icon={FileText}
          href={`${accountPrefix}/listings`}
        />
        <StatCard
          label={t("nav.myPets")}
          value={petsCount}
          icon={Heart}
          href={`${accountPrefix}/pets`}
        />
        <StatCard
          label={t("account.pendingMatchesLabel")}
          value={pendingMatches}
          icon={GitCompare}
          href={`${accountPrefix}/matches`}
        />
      </div>

      {/* Match alerts grouped by listing */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("account.matchesSection")}</h2>
            <p className="text-sm text-muted-foreground">{t("account.matchesSectionHint")}</p>
          </div>
          {matchGroups.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${accountPrefix}/matches`}>{t("account.viewAllMatches")}</Link>
            </Button>
          )}
        </div>

        {matchGroups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("account.noMatches")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matchGroups.slice(0, 5).map((group) => (
              <MatchListingSummary key={group.listing._id.toString()} group={group} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
