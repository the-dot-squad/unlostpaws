import { ModerationReport } from "@/models/moderation-report";
import { setListingStatus } from "@/lib/listings/status";
import { softRemoveListing } from "@/lib/listings/purge-listing";
import { getAppSettings } from "@/lib/services/settings";

/**
 * @typedef {Object} SafetySignal
 * @property {string} code
 * @property {number} weight
 * @property {string} detail
 * @property {string} [url]
 */

/**
 * @typedef {Object} WorkerImageSignals
 * @property {string} [url]
 * @property {object} [safety]
 * @property {object} [relevance]
 * @property {object} [quality]
 */

/**
 * Evaluate vision-worker signals (NSFW, pet relevance, quality) against admin thresholds.
 * Shared by listing moderation and owned-pet ingest.
 *
 * @param {WorkerImageSignals[]} images
 * @param {import("@/models/app-settings").AppSettingsDocument} settings
 * @returns {{ signals: SafetySignal[], worstNsfw: number, worstImage: string, hasHardBlock: boolean, needsReview: boolean }}
 */
export function evaluateImageSafetySignals(images, settings) {
  const reviewThreshold = settings.safetyNsfwReviewThreshold ?? 0.5;
  const blockThreshold = settings.safetyNsfwBlockThreshold ?? 0.85;
  const petMin = settings.safetyPetMinLikelihood ?? 0.35;
  const minW = settings.safetyMinImageWidth ?? 400;
  const minH = settings.safetyMinImageHeight ?? 400;
  const maxBlur = settings.safetyMaxBlurScore ?? 0.85;

  /** @type {SafetySignal[]} */
  const signals = [];
  let worstNsfw = 0;
  let worstImage = "";
  let hasHardBlock = false;
  let needsReview = false;

  for (const img of images) {
    const nsfw = img.safety?.nsfwScore ?? 0;
    if (nsfw >= reviewThreshold) {
      signals.push({
        code: "nsfw_score",
        weight: nsfw,
        detail: `NSFW score ${Math.round(nsfw * 100)}% (${img.safety?.label || "unknown"})`,
        url: img.url,
      });
      if (nsfw > worstNsfw) {
        worstNsfw = nsfw;
        worstImage = img.url || "";
      }
      if (nsfw >= blockThreshold) {
        hasHardBlock = true;
      } else {
        needsReview = true;
      }
    }

    const petLikelihood = img.relevance?.petLikelihood;
    if (typeof petLikelihood === "number" && petLikelihood < petMin) {
      signals.push({
        code: "low_pet_likelihood",
        weight: 1 - petLikelihood,
        detail: `Pet likelihood ${Math.round(petLikelihood * 100)}% (expected ≥ ${Math.round(petMin * 100)}%)`,
        url: img.url,
      });
      needsReview = true;
    }

    const q = img.quality;
    if (q) {
      if (q.width < minW || q.height < minH) {
        signals.push({
          code: "low_resolution",
          weight: 0.5,
          detail: `Image ${q.width}×${q.height} below minimum ${minW}×${minH}`,
          url: img.url,
        });
        needsReview = true;
      }
      if (typeof q.blurScore === "number" && q.blurScore > maxBlur) {
        signals.push({
          code: "blurry_image",
          weight: q.blurScore,
          detail: `Blur score ${Math.round(q.blurScore * 100)}% exceeds max ${Math.round(maxBlur * 100)}%`,
          url: img.url,
        });
        needsReview = true;
      }
    }
  }

  return { signals, worstNsfw, worstImage, hasHardBlock, needsReview };
}

/**
 * Listing moderation — runs after the vision worker callback, before duplicate/abuse checks.
 * Can soft-remove the ad, set under_review, or flag for admin follow-up.
 *
 * @param {Object} params
 * @param {import("mongoose").Document} params.listing
 * @param {WorkerImageSignals[]} params.images
 */
export async function assessContentSafety({ listing, images }) {
  const settings = await getAppSettings();

  if (!settings.safetyEnabled) {
    return { blocked: false, blockMatching: false, action: "none", signals: [] };
  }

  const { signals, worstNsfw, worstImage, hasHardBlock, needsReview } =
    evaluateImageSafetySignals(images, settings);

  if (!signals.length) {
    return { blocked: false, blockMatching: false, action: "none", signals: [] };
  }

  const details = buildDetailsSummary(signals);
  const evidence = { signals, worstImage, worstNsfwScore: worstNsfw };

  if (hasHardBlock && listing.status !== "removed") {
    await softRemoveListing(listing, {
      reason: "inappropriate",
      note: details,
      silent: false,
    });
    await createSafetyReport(listing, evidence, details, "auto_soft_remove");
    return {
      blocked: true,
      blockMatching: true,
      action: "removed",
      signals,
      worstImage,
    };
  }

  if (needsReview && listing.status === "active") {
    await setListingStatus(listing, "under_review");
    await createSafetyReport(listing, evidence, details, "auto_under_review");
    return {
      blocked: true,
      blockMatching: true,
      action: "review",
      signals,
      worstImage,
    };
  }

  await createSafetyReport(listing, evidence, details, "auto_flag");
  return {
    blocked: false,
    blockMatching: true,
    action: "report",
    signals,
    worstImage,
  };
}

/** @param {SafetySignal[]} signals */
function buildDetailsSummary(signals) {
  const top = signals
    .slice(0, 5)
    .map((s) => `${s.code} (${Math.round(s.weight * 100)}%)`)
    .join("; ");
  return `Automated content safety: ${top || "none"}.`;
}

/**
 * @param {import("mongoose").Document} listing
 * @param {object} evidence
 * @param {string} details
 * @param {string} auditAction
 */
async function createSafetyReport(listing, evidence, details, auditAction) {
  const existing = await ModerationReport.findOne({
    listingId: listing._id,
    reporterId: "system",
    reason: "inappropriate",
    status: { $in: ["open", "reviewing"] },
  });

  if (existing) {
    existing.evidence = evidence;
    existing.details = details;
    existing.auditLog.push({
      action: auditAction,
      by: "system",
      note: details,
      at: new Date(),
    });
    await existing.save();
    return;
  }

  await ModerationReport.create({
    listingId: listing._id,
    reporterId: "system",
    reason: "inappropriate",
    details,
    evidence,
    status: "open",
    autoGenerated: true,
    auditLog: [{ action: auditAction, by: "system", note: details }],
  });

  listing.reportCount = (listing.reportCount || 0) + 1;
  await listing.save();
}

/**
 * Owned-pet safety gate — same worker signals, stricter outcome (reject ingest).
 *
 * @param {WorkerImageSignals[]} images
 */
export async function assessOwnedPetSafety(images) {
  const settings = await getAppSettings();
  if (!settings.safetyEnabled) {
    return { ok: true };
  }

  const blockThreshold = settings.safetyNsfwBlockThreshold ?? 0.85;
  const petMin = settings.safetyPetMinLikelihood ?? 0.35;

  for (const img of images) {
    const nsfw = img.safety?.nsfwScore ?? 0;
    if (nsfw >= blockThreshold) {
      return { ok: false, error: "Image failed content safety check" };
    }
    const petLikelihood = img.relevance?.petLikelihood;
    if (typeof petLikelihood === "number" && petLikelihood < petMin) {
      return { ok: false, error: "Image does not appear to show a pet" };
    }
  }

  return { ok: true };
}
