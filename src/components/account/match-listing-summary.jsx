import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { listingPublicId } from "@/models/listing";
import { daysUntilExpiry } from "@/lib/listings/expiry";
import { formatListingAddress, formatListingPetLine } from "@/lib/listings/display";

/**
 * Compact summary of matches for one missing-pet alert — used on dashboard and matches index.
 */
export async function MatchListingSummary({ group, locale }) {
  const t = await getTranslations();
  const { listing, matches, pendingCount } = group;
  const slug = listingPublicId(listing);
  const topMatch = matches[0];
  const topScore = topMatch
    ? Math.round((topMatch.finalScore ?? topMatch.similarityScore) * 100)
    : 0;
  const thumbnail = listing.images?.[0]?.url;
  const daysLeft =
    listing.status === "active" && listing.expiresAt
      ? daysUntilExpiry(listing.expiresAt)
      : 0;

  const href = `/${locale}/account/matches/${slug}`;
  const title = formatListingPetLine(listing, t);
  const address = formatListingAddress(listing, locale);

  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-primary/30">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
            {thumbnail ? (
              <Image src={thumbnail} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                {t("map.noPhoto")}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {t(`listingTypes.${listing.type}`)}
              </Badge>
              <p className="font-medium capitalize">{title}</p>
            </div>
            {address ? (
              <p className="text-sm text-muted-foreground">{address}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.status === "under_review" ? (
                <Badge variant="outline">{t("listings.status.under_review")}</Badge>
              ) : null}
              {daysLeft > 0 ? (
                <Badge variant="secondary">{t("account.daysRemaining", { count: daysLeft })}</Badge>
              ) : null}
              <Badge variant={pendingCount > 0 ? "default" : "secondary"}>
                {t("account.matchCount", { count: matches.length })}
              </Badge>
              {pendingCount > 0 ? (
                <Badge variant="outline">{t("account.pendingMatches", { count: pendingCount })}</Badge>
              ) : null}
              {topScore > 0 ? (
                <Badge variant="secondary">{t("matches.bestScore", { score: topScore })}</Badge>
              ) : null}
            </div>
          </div>

          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
