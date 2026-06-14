/**
 * Locale-prefixed public URL paths — no DB or Node imports; safe in client components.
 */

/** @param {string} publicId @param {string} [locale] */
export function listingPath(publicId, locale = "en") {
  return `/${locale}/listings/${publicId}`;
}

/** @param {string} publicId @param {string} [locale] */
export function userPath(publicId, locale = "en") {
  return `/${locale}/users/${publicId}`;
}

/** @param {string} publicId @param {string} [locale] */
export function ownedPetPath(publicId, locale = "en") {
  return `/${locale}/account/pets/${publicId}`;
}
