/** @file Shared listing title and address formatting for UI surfaces. */

import { getCountryName } from "@/config/countries";

/** Pet type — color — breed line for cards and match views. */
export function formatListingPetLine(listing, t) {
  if (!listing) return "";

  return [t(`petTypes.${listing.petType}`), listing.color, listing.breed]
    .filter(Boolean)
    .join(" — ");
}

/** Address, city, and localized country label. */
export function formatListingAddress(listing, locale) {
  const loc = listing?.location;
  if (!loc) return "";

  const countryLabel = getCountryName(loc.country, locale);
  return [loc.address, loc.city, countryLabel].filter(Boolean).join(", ");
}

/** Map a 0–100 match score to a confidence label key and badge variant. */
export function getMatchConfidenceDisplay(score) {
  if (score >= 75) {
    return { key: "matches.confidenceHigh", variant: "success" };
  }
  if (score >= 50) {
    return { key: "matches.confidenceGood", variant: "default" };
  }
  if (score >= 25) {
    return { key: "matches.confidenceMedium", variant: "secondary" };
  }
  return { key: "matches.confidenceLow", variant: "outline" };
}

/** Status badge variant for match lifecycle states. */
export function getMatchStatusBadgeVariant(status) {
  if (status === "confirmed") return "success";
  if (status === "dismissed") return "outline";
  if (status === "notified") return "default";
  return "secondary";
}
