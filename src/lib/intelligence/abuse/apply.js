/** @file Apply tiered abuse moderation actions and system duplicate reports. */

import { setListingStatus } from "@/lib/listings/status";
import { getAppSettings } from "@/lib/services/settings";
import { softRemoveListing } from "@/lib/listings/purge-listing";
import {
  buildSignalDetailsSummary,
  upsertSystemModerationReport,
} from "@/lib/intelligence/moderation/report";

/**
 * Apply tiered moderation actions from an abuse assessment.
 *
 * @param {Object} params
 * @param {import("mongoose").Document} params.listing
 * @param {number} params.abuseScore
 * @param {import("./risk").AbuseSignal[]} params.signals
 * @param {import("./risk").RelatedListingEvidence[]} params.relatedListings
 * @returns {Promise<{ action: "none"|"report"|"review"|"removed", reported: boolean }>}
 */
export async function applyModeration({ listing, abuseScore, signals, relatedListings }) {
  const settings = await getAppSettings();
  const reportThreshold = settings.abuseReportThreshold ?? 0.7;
  const reviewThreshold = settings.abuseReviewThreshold ?? 0.82;
  const removeThreshold = settings.abuseRemoveThreshold ?? 0.95;

  if (abuseScore < reportThreshold) {
    return { action: "none", reported: false };
  }

  const evidence = {
    riskScore: abuseScore,
    signals,
    relatedListings,
  };

  const details = buildSignalDetailsSummary({
    label: "Automated abuse assessment",
    score: abuseScore,
    signals,
  });

  if (abuseScore >= removeThreshold && listing.status !== "removed") {
    await softRemoveListing(listing, {
      reason: "duplicate",
      note: details,
      silent: false,
      save: false,
    });

    await upsertSystemModerationReport({
      listing,
      reason: "duplicate",
      evidence,
      details,
      auditAction: "auto_soft_remove",
      save: false,
    });
    return { action: "removed", reported: true };
  }

  if (abuseScore >= reviewThreshold && listing.status === "active") {
    await setListingStatus(listing, "under_review", { save: false });
    await upsertSystemModerationReport({
      listing,
      reason: "duplicate",
      evidence,
      details,
      auditAction: "auto_under_review",
      save: false,
    });
    return { action: "review", reported: true };
  }

  await upsertSystemModerationReport({
    listing,
    reason: "duplicate",
    evidence,
    details,
    auditAction: "auto_flag",
    save: false,
  });
  return { action: "report", reported: true };
}
