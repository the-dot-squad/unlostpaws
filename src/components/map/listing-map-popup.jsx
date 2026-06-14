"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, ImageOff, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { getCountryName } from "@/config/countries";
import { cn } from "@/lib/utils";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

const LINK_PROPS = { target: "_blank", rel: "noopener noreferrer" };

/**
 * Popup card on map markers — image links to alert; opens in a new tab.
 * Uses native <img> (not next/image) to avoid optimizer issues with /api/media.
 */
export function ListingMapPopup({ listing, locale }) {
  const t = useTranslations();
  const [imageFailed, setImageFailed] = useState(false);

  const prefix = `/${locale}`;
  const listingUrl = `${prefix}/listings/${listing.id}`;
  const petTypeLabel = t(`petTypes.${listing.petType}`);
  const countryLabel = listing.country
    ? getCountryName(listing.country, locale)
    : "";
  const locationLine = [listing.city, countryLabel].filter(Boolean).join(", ");
  const showImage = listing.thumbnailUrl && !imageFailed;

  function handleListingClick() {
    trackEvent(ANALYTICS_EVENTS.MAP_LISTING_CLICK, { listing_id: listing.id });
  }

  return (
    <div className="listing-map-popup w-[min(100vw-3rem,15rem)] space-y-2.5">
      {listing.thumbnailUrl ? (
        <a
          href={listingUrl}
          {...LINK_PROPS}
          onClick={handleListingClick}
          className="group relative block aspect-[4/3] overflow-hidden rounded-md bg-muted"
          aria-label={t("map.viewAlert")}
        >
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- Leaflet popup; bypass Next image optimizer
            <img
              src={listing.thumbnailUrl}
              alt=""
              className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImageOff className="size-6 opacity-60" aria-hidden />
              <span className="text-xs">{t("map.noPhoto")}</span>
            </div>
          )}
        </a>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {t(`listingTypes.${listing.type}`)}
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs capitalize">
          <PetTypeIcon type={listing.petType} className="size-3" />
          {petTypeLabel}
        </Badge>
      </div>

      <a
        href={listingUrl}
        {...LINK_PROPS}
        onClick={handleListingClick}
        className="block text-sm font-medium capitalize text-foreground hover:underline"
      >
        {petTypeLabel} · {listing.color}
      </a>

      {listing.breed ? (
        <p className="text-xs text-muted-foreground">{listing.breed}</p>
      ) : null}

      {locationLine ? (
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
          {locationLine}
        </p>
      ) : null}

      <a
        href={listingUrl}
        {...LINK_PROPS}
        onClick={handleListingClick}
        className={cn(
          "map-popup-cta inline-flex h-8 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white shadow-none",
          "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {t("map.viewAlert")}
        <ExternalLink className="ms-2 size-3.5 text-white/90" aria-hidden />
      </a>
    </div>
  );
}
