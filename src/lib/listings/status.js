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
  }

  if (syncMl && prev !== status) {
    await syncListingImageStatus(listing._id, status);
  }

  return listing;
}
