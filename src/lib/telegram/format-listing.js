/** @file Build localized Telegram captions and map links for listing posts. */

import { createTranslator } from "next-intl";
import { getCountryName } from "@/config/countries";
import { listingPublicId } from "@/models/listing";
import { absoluteUrl } from "@/lib/seo/routes";
import enMessages from "@messages/en.json";
import faMessages from "@messages/fa.json";

/** Telegram caption limit for media groups. */
const MAX_CAPTION_LENGTH = 1024;

/** Max photos sent per channel post (first two by display order). */
export const TELEGRAM_MAX_IMAGES = 2;

/** Parse mode used for listing captions (Markdown gives reliable clickable links). */
export const TELEGRAM_CAPTION_PARSE_MODE = "Markdown";

const MESSAGES_BY_LOCALE = { en: enMessages, fa: faMessages };

/** Emoji prefix by pet type for channel posts. */
const PET_TYPE_EMOJI = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  rabbit: "🐰",
  hamster: "🐹",
  fish: "🐟",
  reptile: "🦎",
  horse: "🐴",
  monkey: "🐒",
  other: "🐾",
};

/**
 * @param {string} [locale]
 * @returns {"en" | "fa"}
 */
export function normalizeTelegramLocale(locale) {
  return locale === "fa" ? "fa" : "en";
}

/**
 * Namespace-scoped translators for a locale (avoids ambiguous dot-key lookups).
 * @param {string} locale
 */
function createCaptionTranslators(locale) {
  const normalized = normalizeTelegramLocale(locale);
  const messages = MESSAGES_BY_LOCALE[normalized];

  return {
    locale: normalized,
    t: createTranslator({ locale: normalized, messages, namespace: "telegram" }),
    tListingTypes: createTranslator({ locale: normalized, messages, namespace: "listingTypes" }),
    tPetTypes: createTranslator({ locale: normalized, messages, namespace: "petTypes" }),
  };
}

/**
 * Escape user text for Telegram legacy Markdown parse mode.
 * @param {string} value
 */
export function escapeTelegramMarkdown(value) {
  return String(value).replace(/([_*[\]`\\])/g, "\\$1");
}

/**
 * Build a Markdown hyperlink `[label](url)`.
 * @param {string} href
 * @param {string} label
 */
export function markdownLink(href, label) {
  return `[${escapeTelegramMarkdown(label)}](${encodeURI(href)})`;
}

/**
 * Build a Google Maps URL for the given coordinates.
 * @param {number} lat
 * @param {number} lng
 * @returns {string}
 */
export function buildGoogleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Emoji for a pet type (falls back to paw).
 * @param {string} petType
 */
export function getPetTypeEmoji(petType) {
  return PET_TYPE_EMOJI[petType] || PET_TYPE_EMOJI.other;
}

/**
 * Hashtag line — listing type, pet type, and ISO country code.
 * @param {object} listing
 * @returns {string}
 */
export function buildTelegramHashtags(listing) {
  const tags = [`#${listing.type}`, `#${listing.petType}`];
  const country = listing.location?.country?.trim().toLowerCase();
  if (country) tags.push(`#${country}`);
  return tags.join(" ");
}

/**
 * Localized address line (country name respects locale).
 * @param {object} listing
 * @param {string} locale
 */
function formatTelegramAddress(listing, locale) {
  const loc = listing?.location;
  if (!loc) return "";

  const countryLabel = getCountryName(loc.country, locale);
  return [loc.address, loc.city, countryLabel].filter(Boolean).join(", ");
}

/**
 * Truncate caption while keeping the trailing link/hashtag block intact.
 * @param {string} body
 * @param {string} footer
 * @param {number} maxLength
 */
function assembleCaption(body, footer, maxLength = MAX_CAPTION_LENGTH) {
  const separator = body && footer ? "\n\n" : "";
  const full = `${body}${separator}${footer}`;
  if (full.length <= maxLength) return full;

  const footerLength = footer ? footer.length + 2 : 0;
  const bodyBudget = maxLength - footerLength - 1;
  if (bodyBudget <= 0) return truncatePlain(footer, maxLength);

  return `${truncatePlain(body, bodyBudget)}${separator}${footer}`;
}

/** @param {string} text @param {number} maxLength */
function truncatePlain(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

/**
 * Build the Markdown caption for a listing Telegram post.
 *
 * @param {object} listing
 * @param {string} locale
 * @returns {Promise<string>}
 */
export async function buildTelegramListingCaption(listing, locale) {
  const { t, tListingTypes, tPetTypes } = createCaptionTranslators(locale);

  const typeLabel = tListingTypes(listing.type);
  const petTypeLabel = tPetTypes(listing.petType);
  const emoji = getPetTypeEmoji(listing.petType);
  const titleText = `${emoji} ${typeLabel} ${petTypeLabel} — ${listing.color}`;
  const title = `*${escapeTelegramMarkdown(titleText)}*`;

  const bodyLines = [title];

  if (listing.description?.trim()) {
    bodyLines.push("", escapeTelegramMarkdown(listing.description.trim()));
  }

  if (listing.breed) {
    bodyLines.push(
      "",
      `*${escapeTelegramMarkdown(t("breed"))}:* ${escapeTelegramMarkdown(listing.breed)}`
    );
  }

  const address = formatTelegramAddress(listing, locale);
  if (address) {
    bodyLines.push(
      `*${escapeTelegramMarkdown(t("location"))}:* ${escapeTelegramMarkdown(address)}`
    );
  }

  const publicId = listingPublicId(listing);
  const listingUrl = absoluteUrl(locale, `listings/${publicId}`);
  const coords = getListingCoordinates(listing);

  const linkLines = [];
  if (coords) {
    const mapsUrl = buildGoogleMapsUrl(coords.lat, coords.lng);
    linkLines.push(markdownLink(mapsUrl, t("openInMaps")));
  }
  linkLines.push(markdownLink(listingUrl, t("viewListing")));

  const footer = [...linkLines, "", buildTelegramHashtags(listing)].join("\n");
  return assembleCaption(bodyLines.join("\n"), footer);
}

/**
 * Sorted public image URLs for a Telegram post (at most 2, by display order).
 * @param {object} listing
 * @returns {string[]}
 */
export function getListingImageUrls(listing) {
  return [...(listing.images || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((img) => img.url)
    .filter(Boolean)
    .slice(0, TELEGRAM_MAX_IMAGES);
}

/**
 * Read [lng, lat] from a listing location field.
 * @param {object} listing
 * @returns {{ lat: number, lng: number } | null}
 */
export function getListingCoordinates(listing) {
  const coords = listing.location?.coordinates;
  if (!coords || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}
