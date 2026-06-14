/**
 * Listing expiry and extension helpers driven by app settings.
 */

/**
 * Compute initial expiresAt when a listing is created.
 * @param {Date} [from]
 * @param {{ listingExpiryDays: number }} settings
 */
export function computeInitialExpiresAt(from = new Date(), settings) {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + settings.listingExpiryDays);
  return expiresAt;
}

/**
 * Compute new expiresAt after an extension.
 * @param {Date} currentExpiresAt
 * @param {{ listingExtensionDays: number }} settings
 */
export function computeExtendedExpiresAt(currentExpiresAt, settings) {
  const now = new Date();
  const base = currentExpiresAt > now ? new Date(currentExpiresAt) : new Date(now);
  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + settings.listingExtensionDays);
  return expiresAt;
}

/** Whole days from now until `expiresAt` (ceil, minimum 0). */
export function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Whether the listing owner may extend under current settings.
 * @param {{ status: string, expiresAt?: Date | string | null }} listing
 * @param {{
 *   listingExtensionEnabled?: boolean,
 *   listingExtensionFromDay?: number,
 * }} settings
 */
export function canUserExtendListing(listing, settings) {
  if (listing.extensionLocked) {
    return { allowed: false, reason: "reunion_confirmed" };
  }
  if (!settings.listingExtensionEnabled) {
    return { allowed: false, reason: "extension_disabled" };
  }
  if (listing.status !== "active") {
    return { allowed: false, reason: "not_active" };
  }
  if (!listing.expiresAt) {
    return { allowed: false, reason: "no_expiry" };
  }

  const remaining = daysUntilExpiry(listing.expiresAt);
  if (remaining <= 0) {
    return { allowed: false, reason: "already_expired" };
  }

  const fromDay = settings.listingExtensionFromDay ?? 14;
  if (remaining > fromDay) {
    return { allowed: false, reason: "too_early", daysUntil: remaining, fromDay };
  }

  return { allowed: true, daysUntil: remaining };
}

/** Serializable extension policy for client forms. */
export function serializeExtensionPolicy(settings) {
  return {
    enabled: Boolean(settings.listingExtensionEnabled ?? true),
    extensionDays: settings.listingExtensionDays ?? 30,
    fromDay: settings.listingExtensionFromDay ?? 14,
  };
}
