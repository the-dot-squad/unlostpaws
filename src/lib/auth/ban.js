/** @file Account suspension guards — staff protection and ban eligibility. */

/** Roles that must never be banned (platform operators). */
export const STAFF_ROLES = ["admin", "moderator"];

/**
 * @param {string | undefined | null} role
 * @returns {boolean}
 */
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Validate whether an admin ban request is allowed.
 *
 * @param {object} params
 * @param {string | undefined} params.existingRole - Current user role
 * @param {string | undefined} params.nextRole - Role after the update (same as existing when only toggling ban)
 * @param {boolean | undefined} params.banned - Intended ban flag
 * @returns {string | null} Error message when the ban must be rejected, otherwise null
 */
export function getBanGuardError({ existingRole, nextRole, status, banned }) {
  const isBanning = status === "banned" || banned === true;
  if (!isBanning) return null;
  if (isStaffRole(existingRole) || isStaffRole(nextRole)) {
    return "Staff accounts (admin or moderator) cannot be banned";
  }
  return null;
}
