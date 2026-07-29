/** @file Content safety — NSFW / pet relevance / quality gates after vision worker callback. */

import { setListingStatus } from "@/lib/listings/status";
import { softRemoveListing } from "@/lib/listings/purge-listing";
import { getAppSettings } from "@/lib/services/settings";
import {
  buildSignalDetailsSummary,
  upsertSystemModerationReport,
} from "@/lib/intelligence/moderation/report";

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
 * Evaluate vision-worker signals against admin thresholds.
 *
 * @param {WorkerImageSignals[]} images
 * @param {import("@/models/app-settings").AppSettingsDocument} settings
 * @returns {{ signals: SafetySignal[], worstNsfw: number, worstImage: string, hasHardBlock: boolean, needsReview: boolean }}
 */
export function evaluateImageSafetySignals(images, settings) {
  const reviewThreshold = settings.safetyNsfwReviewThreshold ?? 0.5;
  const blockThreshold = settings.safetyNsfwBlockThreshold ?? 0.85;
  const petMin = settings.safetyPetMinLikelihood ?? 0.32;
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
 * Listing moderation — soft-remove, under_review, or flag for admin follow-up.
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

  const details = buildSignalDetailsSummary({
    label: "Automated content safety",
    signals,
  });
  const evidence = { signals, worstImage, worstNsfwScore: worstNsfw };

  if (hasHardBlock && listing.status !== "removed") {
    await softRemoveListing(listing, {
      reason: "inappropriate",
      note: details,
      silent: false,
      save: false,
    });
    await upsertSystemModerationReport({
      listing,
      reason: "inappropriate",
      evidence,
      details,
      auditAction: "auto_soft_remove",
      save: false,
    });
    return {
      blocked: true,
      blockMatching: true,
      action: "removed",
      signals,
      worstImage,
    };
  }

  if (needsReview && listing.status === "active") {
    await setListingStatus(listing, "under_review", { save: false });
    await upsertSystemModerationReport({
      listing,
      reason: "inappropriate",
      evidence,
      details,
      auditAction: "auto_under_review",
      save: false,
    });
    return {
      blocked: true,
      blockMatching: true,
      action: "review",
      signals,
      worstImage,
    };
  }

  await upsertSystemModerationReport({
    listing,
    reason: "inappropriate",
    evidence,
    details,
    auditAction: "auto_flag",
    save: false,
  });
  return {
    blocked: false,
    blockMatching: true,
    action: "report",
    signals,
    worstImage,
  };
}

/**
 * Owned-pet safety gate — reject ingest on hard NSFW / non-pet images.
 *
 * @param {WorkerImageSignals[]} images
 */
export async function assessOwnedPetSafety(images) {
  const settings = await getAppSettings();
  if (!settings.safetyEnabled) {
    return { ok: true };
  }

  const blockThreshold = settings.safetyNsfwBlockThreshold ?? 0.85;
  const petMin = settings.safetyPetMinLikelihood ?? 0.32;

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
