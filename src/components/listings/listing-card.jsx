import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProcessingStatusBadge } from "@/components/listings/processing-status-badge";
import { listingPublicId } from "@/models/listing";
import { MapPin } from "lucide-react";
import { getCountryName } from "@/config/countries";

/**
 * @param {object} props
 * @param {boolean} [props.owner] Account dashboard — status/expiry badges on the card.
 */
export function ListingCard({
  listing,
  locale,
  typeLabel,
  petTypeLabel,
  processingLabel,
  owner = false,
  statusLabel,
  daysRemainingLabel,
}) {
  const prefix = `/${locale}`;
  const slug = listing.publicId ?? listingPublicId(listing);
  const thumb = listing.images?.[0]?.url;
  const countryLabel = getCountryName(listing.location?.country, locale);
  const locationLine = [listing.location?.city, countryLabel].filter(Boolean).join(", ");

  const card = (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {thumb ? (
          <Image src={thumb} alt={`${typeLabel} ${petTypeLabel} — ${listing.color}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
        <Badge className="absolute start-2 top-2">{typeLabel}</Badge>
        <div className="absolute end-2 top-2 flex max-w-[55%] flex-col items-end gap-1">
          {owner && statusLabel ? (
            <Badge variant="outline" className="bg-background/90">
              {statusLabel}
            </Badge>
          ) : null}
          {owner && daysRemainingLabel ? (
            <Badge variant="secondary" className="bg-background/90">
              {daysRemainingLabel}
            </Badge>
          ) : null}
          {listing.processingStatus && listing.processingStatus !== "ready" && processingLabel ? (
            <ProcessingStatusBadge status={listing.processingStatus} label={processingLabel} />
          ) : null}
        </div>
      </div>
      <CardContent className="p-4">
        <p className="font-medium capitalize">
          {petTypeLabel} · {listing.color}
        </p>
        {listing.breed ? <p className="text-sm text-muted-foreground">{listing.breed}</p> : null}
        {locationLine ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {locationLine}
          </p>
        ) : null}
        {listing.distance != null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {(listing.distance / 1000).toFixed(1)} km away
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  return <Link href={`${prefix}/listings/${slug}`}>{card}</Link>;
}
