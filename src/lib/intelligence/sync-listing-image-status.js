import { ListingImage } from "@/models/listing-image";
import {
  updateListingImageStatus as updateQdrantListingImageStatus,
  updateListingImageStatusBulk as updateQdrantListingImageStatusBulk,
} from "@/lib/qdrant";

/**
 * Keep denormalized listingStatus in sync when a listing status changes.
 *
 * @param {import('mongoose').Types.ObjectId|string} listingId
 * @param {string} status
 */
export async function syncListingImageStatus(listingId, status) {
  await ListingImage.updateMany({ listingId }, { $set: { listingStatus: status } });

  try {
    await updateQdrantListingImageStatus(listingId, status);
  } catch (err) {
    console.error(
      `[syncListingImageStatus] Qdrant update failed for listing ${listingId}:`,
      err.message
    );
  }
}

/**
 * Bulk status sync for cron expiry and batch admin operations.
 *
 * @param {import('mongoose').Types.ObjectId|string[]} listingIds
 * @param {string} status
 */
export async function syncListingImageStatusBulk(listingIds, status) {
  if (!listingIds.length) {
    return;
  }

  await ListingImage.updateMany({ listingId: { $in: listingIds } }, { $set: { listingStatus: status } });

  try {
    await updateQdrantListingImageStatusBulk(listingIds, status);
  } catch (err) {
    console.error(
      `[syncListingImageStatusBulk] Qdrant bulk update failed:`,
      err.message
    );
  }
}
