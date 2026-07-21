/** @file Build normalized feed payloads for listing syndication. */

import { getTranslations } from "next-intl/server";
import { getCountryName } from "@/config/countries";
import { FEED_MAX_ITEMS } from "@/config/constants/feeds";
import { searchListings } from "@/lib/listings/search";
import { absoluteUrl } from "@/lib/seo/routes";
import { SITE_NAME } from "@/lib/seo/metadata";
import { buildFeedUrl, feedImageFromListing } from "@/lib/feeds/url";
import { escapeHtml } from "@/lib/email/format";

/**
 * @typedef {object} FeedFilters
 * @property {string} [type]
 * @property {string} [petType]
 * @property {string} [country]
 */

/**
 * @typedef {object} FeedItem
 * @property {string} id
 * @property {string} title
 * @property {string} link
 * @property {string} summary
 * @property {string} contentHtml
 * @property {Date} published
 * @property {Date} updated
 * @property {{ url: string, type: string } | null} image
 * @property {string[]} categories
 */

/**
 * @typedef {object} ListingsFeed
 * @property {string} title
 * @property {string} description
 * @property {string} link
 * @property {string} feedUrl
 * @property {string} homeUrl
 * @property {string} language
 * @property {string} author
 * @property {Date} updated
 * @property {FeedItem[]} items
 */

/**
 * @param {FeedFilters} filters
 * @param {import("next-intl").Translator} t
 * @param {import("next-intl").Translator} tTypes
 * @param {import("next-intl").Translator} tPetTypes
 * @param {string} locale
 */
function buildFeedTitle(filters, t, tTypes, tPetTypes, locale) {
  const parts = [];

  if (filters.type) parts.push(tTypes(filters.type));
  if (filters.petType) parts.push(tPetTypes(filters.petType));
  if (filters.country) parts.push(getCountryName(filters.country, locale));

  if (parts.length === 0) return t("listingsTitle");
  return t("filteredTitle", { filters: parts.join(" · ") });
}

/**
 * @param {FeedFilters} filters
 * @param {import("next-intl").Translator} t
 * @param {import("next-intl").Translator} tTypes
 * @param {import("next-intl").Translator} tPetTypes
 * @param {string} locale
 */
function buildFeedDescription(filters, t, tTypes, tPetTypes, locale) {
  const parts = [];

  if (filters.type) parts.push(tTypes(filters.type));
  if (filters.petType) parts.push(tPetTypes(filters.petType));
  if (filters.country) parts.push(getCountryName(filters.country, locale));

  if (parts.length === 0) return t("listingsDescription");
  return t("filteredDescription", { filters: parts.join(" · ") });
}

/**
 * @param {object} listing
 * @param {string} locale
 * @param {import("next-intl").Translator} tTypes
 * @param {import("next-intl").Translator} tPetTypes
 * @param {import("next-intl").Translator} t
 */
function buildListingItem(listing, locale, tTypes, tPetTypes, t) {
  const typeLabel = tTypes(listing.type);
  const petTypeLabel = tPetTypes(listing.petType);
  const title = `${typeLabel} ${petTypeLabel} — ${listing.color}`;
  const link = absoluteUrl(locale, `listings/${listing.publicId}`);

  const locationParts = [listing.location?.city, listing.location?.country]
    .filter(Boolean)
    .join(", ");

  const summary = listing.description?.trim()
    ? listing.description.trim()
    : t("itemSummary", { type: typeLabel, petType: petTypeLabel, color: listing.color });

  const contentParts = [];
  if (listing.description?.trim()) {
    contentParts.push(`<p>${escapeHtml(listing.description.trim())}</p>`);
  }
  if (listing.breed) {
    contentParts.push(`<p><strong>${escapeHtml(t("breed"))}:</strong> ${escapeHtml(listing.breed)}</p>`);
  }
  if (locationParts) {
    contentParts.push(`<p><strong>${escapeHtml(t("location"))}:</strong> ${escapeHtml(locationParts)}</p>`);
  }

  const sortedImages = [...(listing.images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const primaryImage = feedImageFromListing(sortedImages[0]);
  if (primaryImage) {
    contentParts.push(
      `<p><img src="${escapeHtml(primaryImage.url)}" alt="${escapeHtml(title)}" /></p>`
    );
  }

  const categories = [typeLabel, petTypeLabel];
  if (listing.location?.country) {
    categories.push(getCountryName(listing.location.country, locale));
  }

  return {
    id: link,
    title,
    link,
    summary,
    contentHtml: contentParts.join("\n"),
    published: new Date(listing.createdAt),
    updated: new Date(listing.updatedAt || listing.createdAt),
    image: primaryImage,
    categories,
  };
}

/**
 * Fetch active listings and build a normalized feed document.
 * @param {object} options
 * @param {string} options.locale
 * @param {FeedFilters} options.filters
 * @param {string} options.format
 * @returns {Promise<ListingsFeed>}
 */
export async function buildListingsFeed({ locale, filters, format }) {
  const [t, tTypes, tPetTypes] = await Promise.all([
    getTranslations({ locale, namespace: "feeds" }),
    getTranslations({ locale, namespace: "listingTypes" }),
    getTranslations({ locale, namespace: "petTypes" }),
  ]);

  const { listings } = await searchListings({
    status: "active",
    type: filters.type,
    petType: filters.petType,
    country: filters.country,
    limit: FEED_MAX_ITEMS,
    page: 1,
  });

  const items = listings.map((listing) =>
    buildListingItem(listing, locale, tTypes, tPetTypes, t)
  );

  const updated =
    items.reduce((latest, item) => (item.updated > latest ? item.updated : latest), new Date(0)) ||
    new Date();

  const filterQuery = { type: filters.type, petType: filters.petType, country: filters.country };

  return {
    title: `${buildFeedTitle(filters, t, tTypes, tPetTypes, locale)} | ${SITE_NAME}`,
    description: buildFeedDescription(filters, t, tTypes, tPetTypes, locale),
    link: buildFeedUrl("feeds/listings", { locale, filters: filterQuery }),
    feedUrl: buildFeedUrl("feeds/listings", { locale, filters: filterQuery, format }),
    homeUrl: absoluteUrl(locale),
    language: locale,
    author: SITE_NAME,
    updated: updated.getTime() > 0 ? updated : new Date(),
    items,
  };
}

/** @param {FeedFilters} filters */
export function listingsBrowseUrl(locale, filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.petType) params.set("petType", filters.petType);
  if (filters.country) params.set("country", filters.country);
  const query = params.toString();
  const base = absoluteUrl(locale, "listings");
  return query ? `${base}?${query}` : base;
}

/** Public feed URL for metadata discovery. */
export function listingsFeedDiscoveryUrl(locale, filters = {}, format) {
  return buildFeedUrl("feeds/listings", { locale, filters, format });
}
