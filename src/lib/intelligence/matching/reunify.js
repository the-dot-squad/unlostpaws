/** @file Reunification match decisions — permissions, extension lock, resolution. */

import { ListingMatch } from "@/models/listing-match";
import { Listing } from "@/models/listing";
import { resolveListingRecord } from "@/lib/services/listings";

/** @param {object} match */
export function missingListingIdFromMatch(match) {
  if (match.missingListingId) return match.missingListingId;
  if (match.listingAType === "missing") return match.listingAId;
  if (match.listingBType === "missing") return match.listingBId;
  return null;
}

/** @param {import("mongoose").Types.ObjectId | string} listingId */
export async function hasReunionExtensionLock(listingId) {
  const locked = await ListingMatch.exists({
    tier: "reunification",
    status: "confirmed",
    $or: [{ listingAId: listingId }, { listingBId: listingId }],
  });
  return Boolean(locked);
}

/** @param {object} match @param {string} userId */
export function isMissingListingOwner(match, userId) {
  if (match.tier !== "reunification") return false;
  if (match.listingAType === "missing") return match.listingAUserId === userId;
  if (match.listingBType === "missing") return match.listingBUserId === userId;
  return false;
}

/** @param {import("mongoose").Document} match @param {string} userId */
export async function confirmReunionMatch(match, userId) {
  const missingId = missingListingIdFromMatch(match);
  const missingListing = missingId ? await Listing.findById(missingId) : null;
  if (!missingListing || missingListing.userId !== userId) {
    return { error: "forbidden" };
  }

  if (match.status === "confirmed" || match.status === "dismissed") {
    return { error: "already_decided" };
  }

  const now = new Date();
  match.status = "confirmed";
  match.decidedByUserId = userId;
  match.decidedAt = now;
  await match.save();

  if (missingListing.status === "active") {
    await resolveListingRecord(missingListing);
  }

  // Dismiss sibling reunification candidates for the same missing alert.
  // Prefer missingListingId, but also match by A/B id+type for older rows.
  if (missingId) {
    await ListingMatch.updateMany(
      {
        _id: { $ne: match._id },
        tier: "reunification",
        status: { $in: ["pending", "notified"] },
        $or: [
          { missingListingId: missingId },
          { listingAId: missingId, listingAType: "missing" },
          { listingBId: missingId, listingBType: "missing" },
        ],
      },
      { $set: { status: "dismissed", decidedByUserId: userId, decidedAt: now } }
    );
  }

  return { success: true };
}

/** @param {import("mongoose").Document} match @param {string} userId */
export async function dismissReunionMatch(match, userId) {
  if (!isMissingListingOwner(match, userId)) {
    return { error: "forbidden" };
  }

  if (match.status === "confirmed" || match.status === "dismissed") {
    return { error: "already_decided" };
  }

  match.status = "dismissed";
  match.decidedByUserId = userId;
  match.decidedAt = new Date();
  await match.save();

  return { success: true };
}
