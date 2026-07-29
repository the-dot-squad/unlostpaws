/** @file Listing lifecycle orchestration for actions and moderation. */

import { cache } from "react";
import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { findListingByPublicId } from "@/lib/public-id";
import { setListingStatus } from "@/lib/listings/status";
import { computeExtendedExpiresAt } from "@/lib/listings/expiry";
import { ListingMatch } from "@/models/listing-match";
import { invalidateGeoCache } from "@/lib/listings/cache";

/**
 * Mark a listing resolved by its owner.
 * @param {import("mongoose").Document} listing
 * @returns {Promise<import("mongoose").Document>}
 */
export async function resolveListingRecord(listing) {
  listing.resolvedAt = new Date();
  return setListingStatus(listing, "resolved");
}

/**
 * Soft-remove a listing by its owner.
 * Sets status to "removed" and deletes all existing matches for this listing.
 * @param {import("mongoose").Document} listing
 * @returns {Promise<import("mongoose").Document>}
 */
export async function deleteListingRecord(listing) {
  await setListingStatus(listing, "removed");
  await ListingMatch.deleteMany({
    $or: [{ listingAId: listing._id }, { listingBId: listing._id }],
  });
  return listing;
}

/**
 * Extend expiry and reactivate if currently expired.
 *
 * @param {import("mongoose").Document} listing
 * @param {{ listingExtensionDays: number }} settings
 * @returns {Promise<import("mongoose").Document>}
 */
export async function extendListingRecord(listing, settings) {
  const baseExpiry = listing.expiresAt || new Date();
  listing.expiresAt = computeExtendedExpiresAt(baseExpiry, settings);
  listing.extensionCount = (listing.extensionCount || 0) + 1;

  if (listing.status === "expired") {
    return setListingStatus(listing, "active");
  }

  await listing.save();
  await invalidateGeoCache();
  return listing;
}

/**
 * Admin edit with optional status change — syncs ML index when status changes.
 *
 * @param {import("mongoose").Document} listing
 * @param {object} fields
 * @returns {Promise<import("mongoose").Document>}
 */
export async function applyListingAdminUpdate(listing, fields) {
  const prevStatus = listing.status;

  listing.type = fields.type;
  listing.petType = fields.petType;
  listing.breed = fields.breed || "";
  listing.color = fields.color;
  listing.description = fields.description || "";
  listing.location = fields.location;

  if (prevStatus !== fields.status) {
    return setListingStatus(listing, fields.status);
  }

  listing.status = fields.status;
  await listing.save();
  await invalidateGeoCache();
  return listing;
}

import mongoose from "mongoose";
import { attachListingPublicId } from "@/models/listing";
import { toPlainObject } from "@/lib/utils";

/** Cached listing fetch — shared by page render and generateMetadata. */
export const getListingForPage = cache(async (publicId) => {
  if (!publicId) return null;
  let doc = await findListingByPublicId(publicId);
  if (!doc && mongoose.Types.ObjectId.isValid(publicId)) {
    await connectDB();
    doc = await Listing.findById(publicId);
  }
  if (!doc) return null;
  const plain = toPlainObject(doc);
  return attachListingPublicId(plain);
});
