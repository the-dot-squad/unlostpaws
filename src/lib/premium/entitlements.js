/** @file Premium entitlement helpers — single source of truth for access checks. */

/**
 * @typedef {"none" | "active" | "past_due" | "canceled"} PremiumStatus
 * @typedef {"stripe" | "admin" | null | undefined} PremiumSource
 */

/**
 * True when Premium benefits apply (handle, higher listing caps, phone OTP).
 * `past_due` keeps access while Stripe retries. Expired `premiumPeriodEnd` denies access.
 * `premiumPeriodEnd` null/missing with active status = forever (admin grant).
 *
 * @param {object | null | undefined} user
 */
export function isPremium(user) {
  const status = user?.premiumStatus;
  if (status !== "active" && status !== "past_due") return false;

  const end = user.premiumPeriodEnd;
  if (!end) return true;
  return new Date(end).getTime() > Date.now();
}

/**
 * True when the user has a verified phone on file (persists after Premium ends).
 *
 * @param {object | null | undefined} user
 */
export function isPhoneVerified(user) {
  if (!user?.phoneVerified) return false;
  // Public profile queries omit `phone`; trust phoneVerified when phone is not loaded.
  if (user.phone === undefined) return true;
  return Boolean(user.phone);
}

/**
 * Public verified badge / avatar ring — Premium + verified phone.
 *
 * @param {object | null | undefined} user
 */
export function showsVerifiedBadge(user) {
  return isPremium(user) && isPhoneVerified(user);
}

/**
 * Daily / monthly listing caps for this user from app settings.
 *
 * @param {object | null | undefined} user
 * @param {object} settings
 * @returns {{ maxListingsPerDay: number, maxListingsPerMonth: number, premium: boolean }}
 */
export function listingCapsForUser(user, settings) {
  const premium = isPremium(user);
  return {
    premium,
    maxListingsPerDay: premium
      ? (settings.premiumMaxListingsPerDay ?? 5)
      : (settings.maxListingsPerDay ?? 3),
    maxListingsPerMonth: premium
      ? (settings.premiumMaxListingsPerMonth ?? 25)
      : (settings.maxListingsPerMonth ?? 15),
  };
}

/**
 * Compute period end for an admin grant.
 * @param {number} years — 0 means forever (null end)
 * @returns {Date | null}
 */
export function premiumPeriodEndFromYears(years) {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return null;
  const end = new Date();
  end.setUTCFullYear(end.getUTCFullYear() + Math.floor(n));
  return end;
}

/** Milliseconds in the Premium phone-change cooldown (90 days). */
export const PHONE_CHANGE_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * @param {object | null | undefined} user
 * @returns {Date | null} When the next Premium phone change is allowed, or null if allowed now.
 */
export function phoneChangeAvailableAt(user) {
  if (!user?.phoneChangedAt) return null;
  const next = new Date(user.phoneChangedAt).getTime() + PHONE_CHANGE_COOLDOWN_MS;
  if (next <= Date.now()) return null;
  return new Date(next);
}
