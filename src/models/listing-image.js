/** @file ML index row per processed listing image — embeddings, phash, denormalized filters.
 *
 * Paired with embedded `listing.images` on the parent Listing. `listingStatus` mirrors
 * Listing.status and is updated via `syncListingImageStatus`.
 */

import mongoose from "mongoose";

const listingImageSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    s3Key: { type: String, required: true },
    url: { type: String, required: true },
    md5: { type: String, index: true, sparse: true },
    phash: { type: String, index: true },
    /** First 4 hex chars of phash — narrows near-duplicate candidate set. */
    phashPrefix: { type: String, index: true },
    hasEmbedding: { type: Boolean, default: false, index: true },
    embeddingModel: { type: String, default: "" },
    petType: { type: String, index: true },
    listingType: { type: String, index: true },
    listingStatus: { type: String, index: true, default: "active" },
  },
  { timestamps: true }
);

listingImageSchema.index({ listingType: 1, petType: 1, listingStatus: 1, listingId: 1 });
listingImageSchema.index({ createdAt: -1, phash: 1 });
listingImageSchema.index({ phashPrefix: 1, createdAt: -1 });

export const ListingImage =
  mongoose.models.ListingImage || mongoose.model("ListingImage", listingImageSchema);
