import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { filterMatches, getMatchFilterCounts, getMatchesForListing } from "@/lib/intelligence/matching/reads";
import { MatchCard } from "@/components/account/match-card";
import { MatchFilterBar } from "@/components/account/match-filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatListingPetLine } from "@/lib/listings/display";
import { listingPublicId } from "@/models/listing";
import { ArrowLeft } from "lucide-react";

export default async function ListingMatchesPage({ params, searchParams }) {
  const { locale, listingId } = await params;
  const { filter: filterParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await requireActiveSessionPage(locale);

  const data = await getMatchesForListing(session.user.id, listingId);
  if (!data) notFound();

  const { listing, matches } = data;
  const filter = filterParam || "active";
  const counts = getMatchFilterCounts(matches);
  const filtered = filterMatches(matches, filter);
  const listingTitle = formatListingPetLine(listing, t);
  const listingSlug = listingPublicId(listing);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href={`/${locale}/account/matches`} aria-label={t("common.back")}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          {listing.images?.[0]?.url && (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border">
              <Image src={listing.images[0].url} alt="" fill className="object-cover" sizes="64px" />
            </div>
          )}
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {t(`listingTypes.${listing.type}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("matches.forListingSubtitle", { count: matches.length })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight capitalize">{listingTitle}</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={`/${locale}/listings/${listingSlug}`}>{t("matches.viewYourAlert")}</Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <MatchFilterBar counts={counts} />
      </Suspense>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("matches.noFiltered")}</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((match) => (
            <MatchCard
              key={match._id.toString()}
              match={match}
              locale={locale}
              userListing={listing}
            />
          ))}
        </div>
      )}
    </div>
  );
}
