/**
 * Locale-prefixed public URL paths — no DB or Node imports; safe in client components.
 */

/** @param {string} publicId @param {string} [locale] */
export function listingPath(publicId, locale = "en") {
  return `/${locale}/listings/${publicId}`;
}

/** @param {string} identifier @param {string} [locale] */
export function userPath(identifier, locale = "en") {
  const clean = String(identifier || "").replace(/^@/, "");
  return `/${locale}/@${clean}`;
}

/** @param {string} publicId @param {string} [locale] */
export function ownedPetPath(publicId, locale = "en") {
  return `/${locale}/account/pets/${publicId}`;
}
