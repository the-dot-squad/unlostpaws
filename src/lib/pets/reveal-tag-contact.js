/** @file Business logic for revealing Digital Collar owner contact details. */

import { getAuthUserById } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/session";
import {
  isDigitalCollarEligible,
  normalizeDigitalCollar,
} from "@/lib/pets/digital-collar-shared";
import { findOwnedPetByPublicId } from "@/lib/public-id";
import { isPhoneVerified } from "@/lib/premium/entitlements";

/**
 * Resolve contact details for an eligible Digital Collar after Turnstile verification.
 *
 * @param {string} publicId Owned-pet public id from the tag URL
 * @returns {Promise<
 *   | { ok: true, contact: { email?: string, phone?: string } }
 *   | { ok: false, status: number, error: string }
 * >}
 */
export async function revealTagContact(publicId) {
  const pet = await findOwnedPetByPublicId(publicId, { status: { $ne: "removed" } });
  if (!pet) {
    return { ok: false, status: 404, error: "not_found" };
  }

  const owner = await getAuthUserById(pet.userId);
  if (!isDigitalCollarEligible(pet, owner)) {
    return { ok: false, status: 403, error: "collar_inactive" };
  }

  const session = await getSession();
  if (session?.user?.id === pet.userId) {
    return { ok: false, status: 400, error: "self_contact" };
  }

  const collar = normalizeDigitalCollar(pet);
  const contact = {};

  if (collar.allowEmail && owner?.email) {
    contact.email = owner.email;
  }
  if (collar.allowPhone && isPhoneVerified(owner)) {
    contact.phone = owner.phone;
  }

  if (!contact.email && !contact.phone) {
    return { ok: false, status: 403, error: "contact_disabled" };
  }

  return { ok: true, contact };
}
