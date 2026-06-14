/** @file Listing document — public alerts with embedded images for UI display.
 *
 * Image contract: `images[]` is the source of truth for rendering. After ML processing,
 * `ListingImage` + Qdrant hold embeddings and denormalized `listingStatus`. Any status
 * change must go through `setListingStatus` in `@/lib/listings/status`.
 */

import mongoose from "mongoose";
import { hasSetCoordinates } from "@/lib/geo";
import { encodeListingPublicId } from "@/lib/public-id/listing";
import { resolveImageUrl } from "@/lib/storage/urls";
import { LISTING_STATUSES, LISTING_TYPES, PET_TYPES, PROCESSING_STATUSES } from "@/config/constants/enums";

const imageSchema = new mongoose.Schema(
  {
    s3Key: { type: String, required: true },
    url: { type: String, required: true },
    md5: String,
    phash: String,
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const listingSchema = new mongoose.Schema(
  {
    type: { type: String, enum: LISTING_TYPES, required: true, index: true },
    status: { type: String, enum: LISTING_STATUSES, default: "active", index: true },
    processingStatus: {
      type: String,
      enum: PROCESSING_STATUSES,
      default: "pending",
      index: true,
    },
    processingError: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    petType: { type: String, enum: PET_TYPES, required: true, index: true },
    breed: { type: String, default: "" },
    color: { type: String, required: true },
    description: { type: String, default: "" },
    images: {
      type: [imageSchema],
      validate: [(v) => v.length >= 2, "At least 2 images required"],
    },
    location: {
      address: String,
      city: String,
      country: String,
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => v.length === 2,
          message: "Coordinates must be [lng, lat]",
        },
      },
    },
    locationSource: { type: String, enum: ["manual", "exif"], default: "manual" },
    contact: {
      allowEmail: { type: Boolean, default: true },
      allowPhone: { type: Boolean, default: false },
    },
    userId: { type: String, required: true, index: true },
    /** Lifetime user reports received — use moderation queue for open counts. */
    reportCount: { type: Number, default: 0 },
    expiresAt: { type: Date, index: true },
    extensionCount: { type: Number, default: 0 },
    resolvedAt: Date,
    lastMatchScanAt: { type: Date, index: true },
    /** Set when moderation soft-removes the listing (record kept for owner history). */
    moderationRemovedAt: Date,
    moderationReason: { type: String, default: "" },
  },
  { timestamps: true }
);

listingSchema.index({ "location.coordinates": "2dsphere" });
listingSchema.index({ "location.country": 1, status: 1, createdAt: -1 });
listingSchema.index({ type: 1, status: 1, createdAt: -1 });
listingSchema.index({ description: "text", breed: "text", color: "text" });

export const Listing =
  mongoose.models.Listing || mongoose.model("Listing", listingSchema);

/** URL slug for a listing document or lean result. */
export function listingPublicId(listing) {
  const id = listing?._id ?? listing?.id;
  if (!id) throw new Error("Listing is missing _id");
  return encodeListingPublicId(id);
}

/** Attach computed `publicId` for components and API responses. */
export function attachListingPublicId(listing) {
  if (!listing?._id && !listing?.id) return listing;
  return { ...listing, publicId: listingPublicId(listing) };
}

/** Plain image refs for Server → Client props. */
export function serializeListingImages(images) {
  return (images || []).map((img, index) => ({
    id: img._id?.toString?.() ?? String(index),
    url: resolveImageUrl(img) ?? String(img.url),
    order: img.order ?? index,
  }));
}

/** Plain location for Server → Client props. */
export function serializeListingLocation(location) {
  if (!location) return null;

  const lng = Number(location.coordinates?.[0]);
  const lat = Number(location.coordinates?.[1]);

  return {
    address: location.address ?? "",
    city: location.city ?? "",
    country: location.country ?? "",
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    hasCoords: hasSetCoordinates(lng, lat),
  };
}
