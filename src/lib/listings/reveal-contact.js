/** @file Business logic for revealing listing owner contact details. */

import { getAuthUserById } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/session";
import { findListingByPublicId } from "@/lib/public-id";

/**
 * Resolve contact details for an active listing after Turnstile verification.
 *
 * @param {string} publicId Listing public hashid from the URL
 * @returns {Promise<
 *   | { ok: true, contact: { email?: string, phone?: string } }
 *   | { ok: false, status: number, error: string }
 * >}
 */
export async function revealListingContact(publicId) {
  const listing = await findListingByPublicId(publicId);
  if (!listing || listing.status !== "active") {
    return { ok: false, status: 404, error: "not_found" };
  }

  const session = await getSession();
  if (session?.user?.id === listing.userId) {
    return { ok: false, status: 400, error: "self_contact" };
  }

  const owner = await getAuthUserById(listing.userId);
  const contact = {};

  if (listing.contact.allowEmail && owner?.email) {
    contact.email = owner.email;
  }
  if (listing.contact.allowPhone && owner?.phone) {
    contact.phone = owner.phone;
  }

  if (!contact.email && !contact.phone) {
    return { ok: false, status: 403, error: "contact_disabled" };
  }

  return { ok: true, contact };
}
