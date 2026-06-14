/** @file Cross-listing image match — canonical unordered pair with tier and scores. */

import mongoose from "mongoose";
import { CONFIDENCE_TIERS, LISTING_TYPES, MATCH_STATUSES, MATCH_TIERS } from "@/config/constants/enums";

const listingMatchSchema = new mongoose.Schema(
  {
    /** Canonical unordered pair (lexicographic min/max ObjectId). */
    listingAId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    listingBId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    listingAUserId: { type: String, required: true, index: true },
    listingBUserId: { type: String, required: true, index: true },
    listingAType: { type: String, enum: LISTING_TYPES, required: true },
    listingBType: { type: String, enum: LISTING_TYPES, required: true },
    /** Reunification tier only — the missing alert in the pair. */
    missingListingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", index: true },
    /** Reunification tier only — the found/sighting/surrender side. */
    counterpartListingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", index: true },
    tier: { type: String, enum: MATCH_TIERS, required: true, index: true },
    /** Listing that triggered the most recent scan. */
    sourceListingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    embeddingScore: { type: Number, default: 0 },
    metadataScore: { type: Number, default: 0 },
    finalScore: { type: Number, required: true },
    confidenceTier: { type: String, enum: CONFIDENCE_TIERS, default: "medium" },
    matchedImageAUrl: String,
    matchedImageBUrl: String,
    status: { type: String, enum: MATCH_STATUSES, default: "pending", index: true },
    decidedByUserId: { type: String, index: true },
    decidedAt: Date,
    notifiedAt: Date,
    notifiedUserIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

listingMatchSchema.index({ listingAId: 1, listingBId: 1 }, { unique: true });
listingMatchSchema.index({ listingAUserId: 1, status: 1 });
listingMatchSchema.index({ listingBUserId: 1, status: 1 });
listingMatchSchema.index({ missingListingId: 1, status: 1 });

export const ListingMatch =
  mongoose.models.ListingMatch || mongoose.model("ListingMatch", listingMatchSchema);
