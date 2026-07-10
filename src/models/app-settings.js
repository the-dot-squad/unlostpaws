/** @file Singleton platform settings — reads/writes via `@/lib/services/settings`. */

import mongoose from "mongoose";
import { PET_TYPES } from "@/config/constants/enums";

const appSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "default", unique: true },
    maxListingsPerDay: { type: Number, default: 3 },
    maxListingsPerMonth: { type: Number, default: 15 },
    imageMatchingEnabled: { type: Boolean, default: true },
    matchSimilarityThreshold: { type: Number, default: 0.82 },
    matchConfidenceHighThreshold: { type: Number, default: 0.9 },
    /** Hours to look back when counting independent reports for auto-review. */
    reportAutoReviewWindowHours: { type: Number, default: 168 },
    /** Distinct reporters (unique IP) needed to auto-flag a listing for review. */
    reportAutoReviewMinReports: { type: Number, default: 3 },
    /** Confirmed violations before the listing owner's account is suspended. */
    confirmedViolationBanThreshold: { type: Number, default: 3 },
    /** Daily report cap per user — exceeding it auto-bans the account. */
    maxReportsPerDay: { type: Number, default: 50 },
    listingExpiryDays: { type: Number, default: 90 },
    /** Whether owners can extend active listings before they expire. */
    listingExtensionEnabled: { type: Boolean, default: true },
    /** Days added to expiresAt on each extension. */
    listingExtensionDays: { type: Number, default: 30 },
    /** Owners may extend when expiry is within this many days. */
    listingExtensionFromDay: { type: Number, default: 14 },
    supportedPetTypes: { type: [String], default: PET_TYPES },
    geoMatchRadiusKm: { type: Number, default: 100 },
    dedupLookbackDays: { type: Number, default: 365 },
    reverseSearchMaxListings: { type: Number, default: 500 },
    maxOwnedPetsPerUser: { type: Number, default: 10 },
    /** Abuse score at or above → auto moderation report. */
    abuseReportThreshold: { type: Number, default: 0.7 },
    /** Abuse score at or above → listing under_review. */
    abuseReviewThreshold: { type: Number, default: 0.82 },
    /** Abuse score at or above → soft remove + violation strike. */
    abuseRemoveThreshold: { type: Number, default: 0.95 },
    /** Pair-level abuse score blocking a listing match. */
    matchBlockThreshold: { type: Number, default: 0.5 },
    /** Extra strictness for non-missing cross-type pairs (found↔sighting, etc.). */
    corroborationThresholdMultiplier: { type: Number, default: 1.1 },
    sameUserRepostLookbackDays: { type: Number, default: 30 },
    /** Content safety — master toggle for automated image moderation. */
    safetyEnabled: { type: Boolean, default: true },
    /** NSFW score at or above → listing under_review. */
    safetyNsfwReviewThreshold: { type: Number, default: 0.5 },
    /** NSFW score at or above → soft remove listing. */
    safetyNsfwBlockThreshold: { type: Number, default: 0.85 },
    /** Pet relevance below this → flag as non-pet content. */
    safetyPetMinLikelihood: { type: Number, default: 0.35 },
    safetyMinImageWidth: { type: Number, default: 400 },
    safetyMinImageHeight: { type: Number, default: 400 },
    /** Blur score above this fails quality check (0–1, higher = blurrier). */
    safetyMaxBlurScore: { type: Number, default: 0.85 },
    /** External profile URLs — empty until set in admin. */
    socialLinks: {
      type: [
        {
          platform: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Re-register when the schema changes (Next.js dev hot reload keeps a stale model).
if (mongoose.models.AppSettings) {
  delete mongoose.models.AppSettings;
}

export const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
