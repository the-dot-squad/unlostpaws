import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getMatchGroupsForUser } from "@/lib/intelligence/matching/account";
import { MatchListingSummary } from "@/components/account/match-listing-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MatchesPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();

  const matchGroups = await getMatchGroupsForUser(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("matches.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("matches.subtitle")}</p>
      </div>

      {matchGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">{t("account.noMatches")}</p>
            <Button variant="outline" asChild>
              <Link href={`/${locale}/listings/new`}>{t("nav.createListing")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matchGroups.map((group) => (
            <MatchListingSummary key={group.listing._id.toString()} group={group} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
