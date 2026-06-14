import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchActions } from "@/components/account/match-actions";
import { listingPublicId } from "@/models/listing";
import {
  formatListingAddress,
  formatListingPetLine,
  getMatchConfidenceDisplay,
  getMatchStatusBadgeVariant,
} from "@/lib/listings/display";

/**
 * Single AI match card with paired thumbnails and owner actions when applicable.
 */
export async function MatchCard({ match, locale, userListing }) {
  const t = await getTranslations();
  const counterpart = match.counterpartListing;
  if (!counterpart) return null;

  const score = Math.round((match.finalScore ?? 0) * 100);
  const confidence = getMatchConfidenceDisplay(score);
  const isResolved = match.status === "dismissed" || match.status === "confirmed";
  const statusKey = `matches.status.${match.status}`;
  const title = formatListingPetLine(counterpart, t);
  const address = formatListingAddress(counterpart, locale);

  const isA = userListing && String(match.listingAId) === String(userListing._id);
  const ownImage = isA ? match.matchedImageAUrl : match.matchedImageBUrl;
  const otherImage = isA ? match.matchedImageBUrl : match.matchedImageAUrl;

  const canDecide =
    match.tier === "reunification" &&
    userListing?.type === "missing" &&
    !isResolved;

  const isViewOnly =
    match.tier === "reunification" && userListing?.type !== "missing";

  return (
    <Card className={isResolved ? "opacity-75" : undefined}>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-1">
          {ownImage && (
            <div className="relative size-24 overflow-hidden rounded-lg border">
              <Image
                src={ownImage}
                alt={t("matches.yourPet")}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          )}
          <span className="px-1 text-xs text-muted-foreground">↔</span>
          {(otherImage || counterpart.images?.[0]?.url) && (
            <div className="relative size-24 overflow-hidden rounded-lg border">
              <Image
                src={otherImage || counterpart.images[0].url}
                alt={t("matches.candidate")}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {t(`listingTypes.${counterpart.type}`)}
              </Badge>
              <p className="font-medium capitalize">{title}</p>
            </div>
            {address ? (
              <p className="text-sm text-muted-foreground">{address}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{t("matches.similarity", { score })}</Badge>
            {match.tier && (
              <Badge variant="outline" className="capitalize">
                {match.tier}
              </Badge>
            )}
            <Badge variant={confidence.variant}>{t(confidence.key)}</Badge>
            <Badge variant={getMatchStatusBadgeVariant(match.status)}>{t(statusKey)}</Badge>
          </div>

          {match.status === "notified" && canDecide && (
            <p className="text-xs text-muted-foreground">{t("matches.notified")}</p>
          )}

          {match.status === "confirmed" && userListing?.type === "missing" && (
            <p className="text-xs text-muted-foreground">{t("matches.reunitedMessage")}</p>
          )}

          {isViewOnly && !isResolved && (
            <p className="text-xs text-muted-foreground">{t("matches.viewOnlyHint")}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={`/${locale}/listings/${listingPublicId(counterpart)}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("matches.viewCandidate")}
          </Link>
          {canDecide && <MatchActions matchId={match._id.toString()} />}
        </div>
      </CardContent>
    </Card>
  );
}
