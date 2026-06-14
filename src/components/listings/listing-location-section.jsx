"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { ListingReadonlyMap } from "@/components/map/listing-readonly-map";

/**
 * Location address with an inline map below.
 * Receives plain serializable props from the server page (no Mongoose types).
 */
export function ListingLocationSection({
  address,
  city,
  countryLabel,
  lat,
  lng,
  hasCoords,
  listingType,
}) {
  const t = useTranslations("listings");
  const addressLine = [address, city, countryLabel].filter(Boolean).join(", ");

  if (!addressLine && !hasCoords) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium">{t("location")}</p>
          {addressLine ? (
            <p className="text-muted-foreground">{addressLine}</p>
          ) : (
            <p className="text-muted-foreground">
              {lat?.toFixed(5)}, {lng?.toFixed(5)}
            </p>
          )}
        </div>
      </div>

      {hasCoords && (
        <ListingReadonlyMap lat={lat} lng={lng} listingType={listingType} />
      )}
    </div>
  );
}
