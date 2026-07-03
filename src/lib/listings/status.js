/** @file Listing status transitions with ML denormalized field sync. */

import { syncListingImageStatus } from "@/lib/intelligence/sync-listing-image-status";

/**
 * Persist listing status and sync `listingStatus` on ListingImage + Qdrant payloads.
 *
 * @param {import("mongoose").Document} listing
 * @param {string} status
 * @param {{ syncMl?: boolean, save?: boolean }} [options]
 * @returns {Promise<import("mongoose").Document>}
 */
export async function setListingStatus(listing, status, { syncMl = true, save = true } = {}) {
  const prev = listing.status;
  listing.status = status;
  if (save) {
    await listing.save();
    if (syncMl && prev !== status) {
      await syncListingImageStatus(listing._id, status);
    }
  } else {
    // If not saving immediately, store the sync task on the listing document in-memory.
    // This prevents syncing intermediate/unsaved states if database save eventually fails.
    if (syncMl && prev !== status) {
      if (!listing._deferredSyncs) {
        listing._deferredSyncs = [];
      }
      listing._deferredSyncs.push(() => syncListingImageStatus(listing._id, status));
    }
  }

  return listing;
}

/**
 * Executes and flushes all deferred status synchronizations registered on the listing.
 * Should be called after successful save operations when save: false was used.
 *
 * @param {import("mongoose").Document} listing
 * @returns {Promise<void>}
 */
export async function commitStatusSync(listing) {
  if (listing._deferredSyncs?.length) {
    await Promise.all(listing._deferredSyncs.map((syncFn) => syncFn()));
    listing._deferredSyncs = [];
  }
}
