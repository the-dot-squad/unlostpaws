/** @file Shared owner-scoped resource lookups for server actions. */

import { findListingByPublicId, findOwnedPetByPublicId } from "@/lib/public-id";

/**
 * @param {Awaited<ReturnType<typeof import("@/lib/auth/session").requireActiveSession>>} session
 * @param {string} publicId
 * @param {object} [extraQuery]
 */
export async function requireOwnedListing(session, publicId, extraQuery = {}) {
  const listing = await findListingByPublicId(publicId, { userId: session.user.id, ...extraQuery });
  if (!listing) return { error: "Not found" };
  return { listing };
}

/**
 * @param {Awaited<ReturnType<typeof import("@/lib/auth/session").requireActiveSession>>} session
 * @param {string} publicId
 */
export async function requireOwnedPet(session, publicId) {
  const pet = await findOwnedPetByPublicId(publicId, { userId: session.user.id });
  if (!pet) return { error: "NOT_FOUND" };
  return { pet };
}
