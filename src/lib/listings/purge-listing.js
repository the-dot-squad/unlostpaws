import { Listing } from "@/models/listing";
import { ListingImage } from "@/models/listing-image";
import { ListingMatch } from "@/models/listing-match";
import { ModerationReport } from "@/models/moderation-report";
import { deleteListingImageVectorsByListingId } from "@/lib/qdrant/listing-images";
import { deleteStoredMedia } from "@/lib/storage/delete";
import { setListingStatus } from "@/lib/listings/status";
import { recordConfirmedViolation } from "@/lib/moderation/violations";
import { getAppSettings } from "@/lib/services/settings";

/**
 * Delete listing image files from storage and remove ML-derived records.
 * @param {Pick<import("@/models/listing").Listing, "_id" | "images">} listing
 */
export async function purgeListingAssets(listing) {
  for (const image of listing.images || []) {
    await deleteStoredMedia(image);
  }

  try {
    await deleteListingImageVectorsByListingId(listing._id);
  } catch {
    // Qdrant may be unavailable in some environments.
  }

  await Promise.all([
    ListingImage.deleteMany({ listingId: listing._id }),
    ListingMatch.deleteMany({
      $or: [{ listingAId: listing._id }, { listingBId: listing._id }],
    }),
  ]);
}

/**
 * Soft-remove a listing for moderation — keeps Mongo record in owner history.
 * Hides from public search/matching and records a violation strike.
 *
 * @param {import("mongoose").Document} listing
 * @param {object} [options]
 * @param {string} [options.reason]
 * @param {string} [options.note]
 * @param {boolean} [options.silent] Skip owner warning email
 */
export async function softRemoveListing(listing, { reason = "duplicate", note = "", silent = false, save = true } = {}) {
  if (listing.status === "removed") {
    return { alreadyRemoved: true };
  }

  const settings = await getAppSettings();

  listing.moderationRemovedAt = new Date();
  listing.moderationReason = reason;
  await setListingStatus(listing, "removed", { save });

  await recordConfirmedViolation(listing.userId, {
    listing,
    reason,
    note,
    settings,
    silent,
  });

  return { alreadyRemoved: false };
}

/**
 * Permanently erase a listing — storage files, ML data, moderation history, and the record.
 * Admin-only destructive action.
 *
 * @param {Pick<import("@/models/listing").Listing, "_id" | "images">} listing
 */
export async function deleteListingCompletely(listing) {
  await purgeListingAssets(listing);
  await ModerationReport.deleteMany({ listingId: listing._id });
  await Listing.deleteOne({ _id: listing._id });
}
