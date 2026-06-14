/** @file Listing status transitions with ML denormalized field sync. */

import { syncListingImageStatus } from "@/lib/intelligence/sync-listing-image-status";

/**
 * Persist listing status and sync `listingStatus` on ListingImage + Qdrant payloads.
 *
 * @param {import("mongoose").Document} listing
 * @param {string} status
 * @param {{ syncMl?: boolean }} [options]
 * @returns {Promise<import("mongoose").Document>}
 */
export async function setListingStatus(listing, status, { syncMl = true } = {}) {
  const prev = listing.status;
  listing.status = status;
  await listing.save();

  if (syncMl && prev !== status) {
    await syncListingImageStatus(listing._id, status);
  }

  return listing;
}
