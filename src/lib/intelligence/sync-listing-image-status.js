import { ListingImage } from "@/models/listing-image";
import { updateListingImageStatus as updateQdrantListingImageStatus } from "@/lib/qdrant";

const BULK_CONCURRENCY = 10;

/**
 * Run async tasks with a concurrency cap.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<void>} fn
 * @param {number} [concurrency]
 */
async function mapConcurrent(items, fn, concurrency = BULK_CONCURRENCY) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

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

  await mapConcurrent(listingIds, async (listingId) => {
    try {
      await updateQdrantListingImageStatus(listingId, status);
    } catch (err) {
      console.error(
        `[syncListingImageStatusBulk] Qdrant update failed for listing ${listingId}:`,
        err.message
      );
    }
  });
}
