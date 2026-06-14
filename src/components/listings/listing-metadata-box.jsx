import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarClock, MapPin, MessageCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ContactButton } from "@/components/listings/contact-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDateTime } from "@/lib/format";

/** Minimum gap between created and updated before showing both timestamps. */
const UPDATED_THRESHOLD_MS = 60_000;

/**
 * One labeled timestamp row with a semantic <time> element.
 */
function TimestampRow({ label, iso, formatted }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium text-foreground">{label}:</span>{" "}
        <time dateTime={iso} suppressHydrationWarning>
          {formatted}
        </time>
      </span>
    </p>
  );
}

/**
 * Metadata panel for a listing detail page.
 *
 * Poster info on the left, gated contact on the right — separated by a clean
 * vertical rule on desktop (not a bordered box fragment).
 */
export async function ListingMetadataBox({
  locale,
  createdAt,
  updatedAt,
  owner,
  listingId,
  showContact,
}) {
  const t = await getTranslations();

  const createdIso = new Date(createdAt).toISOString();
  const updatedIso = updatedAt ? new Date(updatedAt).toISOString() : null;
  const showUpdated =
    updatedAt &&
    new Date(updatedAt).getTime() - new Date(createdAt).getTime() > UPDATED_THRESHOLD_MS;

  const posterName = owner?.name || t("listings.anonymousPoster");

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          {/* Poster identity and timestamps */}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar name={posterName} imageUrl={owner?.image} size="md" />
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <User className="size-3.5" aria-hidden />
                  {t("listings.postedBy")}
                </p>
                {owner?.profileHref ? (
                  <Link
                    href={owner.profileHref}
                    className="truncate text-base font-semibold hover:text-primary hover:underline"
                  >
                    {posterName}
                  </Link>
                ) : (
                  <p className="truncate text-base font-semibold">{posterName}</p>
                )}
                {owner?.countryLabel ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {owner.countryLabel}
                  </p>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <TimestampRow
                label={t("listings.createdAt")}
                iso={createdIso}
                formatted={formatDateTime(createdAt, locale)}
              />
              {showUpdated ? (
                <TimestampRow
                  label={t("listings.updatedAt")}
                  iso={updatedIso}
                  formatted={formatDateTime(updatedAt, locale)}
                />
              ) : null}
            </div>
          </div>

          {/* Gated contact — separate panel, no shared border with the divider */}
          {showContact ? (
            <>
              <Separator className="md:hidden" />
              <Separator
                orientation="vertical"
                className="hidden md:block md:mx-2"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="rounded-xl bg-muted/40 p-5">
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MessageCircle className="size-3.5" aria-hidden />
                    {t("listings.contact")}
                  </p>
                  <ContactButton listingId={listingId} embedded />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
