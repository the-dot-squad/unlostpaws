/** @file Listing ingest after vision worker — safety → abuse → persist → match → notify. */

import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { assessContentSafety } from "@/lib/intelligence/safety/content";
import { assessAbuseRisk } from "@/lib/intelligence/abuse/risk";
import { applyModeration } from "@/lib/intelligence/abuse/apply";
import { persistListingImages } from "@/lib/intelligence/ingest/persist-images";
import { findListingMatches } from "@/lib/intelligence/matching/cross-type";
import { notifyListingMatches } from "@/lib/intelligence/matching/notify";
import { commitStatusSync } from "@/lib/listings/status";
import { tryPostListingToTelegram } from "@/lib/telegram";

/**
 * Post-worker ingest for listings.
 *
 * Order (moderation before dedup/matching):
 *   1. Content safety — NSFW, pet relevance, quality (may remove or hold the ad)
 *   2. Abuse / duplicate — MD5, pHash, embedding similarity
 *   3. Persist images + vector search + cross-type matching
 *
 * @param {Object} params
 * @param {string} params.listingId
 * @param {Array<{ url: string, s3Key?: string, md5: string, phash: string, embedding?: number[], safety?: object, relevance?: object, quality?: object }>} params.images
 * @param {Array<{ url: string, error: string }>} [params.errors]
 * @param {string} [params.embeddingModel]
 */
export async function ingestProcessedListing({
  listingId,
  images,
  errors = [],
  embeddingModel,
  workerVersion,
  runtime,
  executionProvider,
  modelPrecision,
  safetyModel,
}) {
  await connectDB();

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return { error: "Listing not found", status: 404 };
  }

  // Populate ML worker execution details for logging and auditability
  const modelId = embeddingModel || listing.embeddingModel || "";
  listing.embeddingModel = modelId;
  listing.worker = {
    version: workerVersion || "",
    runtime: runtime || "",
    executionProvider: executionProvider || "",
    precision: modelPrecision || "",
    safetyModel: safetyModel || "",
  };

  if (!images?.length && errors.length) {
    listing.processingStatus = "failed";
    listing.processingError = errors.map((e) => e.error).join("; ");
    await listing.save();
    return { success: false, failed: true };
  }

  if (!images?.length) {
    return { error: "No images processed", status: 400 };
  }

  const contentSafety = await assessContentSafety({ listing, images });

  if (contentSafety.blocked) {
    listing.processingStatus = "ready";
    listing.processingError = errors.length
      ? errors.map((e) => `${e.url}: ${e.error}`).join("; ")
      : "";
    await listing.save();
    await commitStatusSync(listing);
    return {
      success: true,
      contentBlocked: true,
      moderation: contentSafety.action,
      contentSignals: contentSafety.signals,
    };
  }

  const risk = await assessAbuseRisk({ listing, images, embeddingModel: modelId });

  const moderation = await applyModeration({
    listing,
    abuseScore: risk.abuseScore,
    signals: risk.signals,
    relatedListings: risk.relatedListings,
  });

  if (risk.hasMd5Match || moderation.action === "removed") {
    listing.processingStatus = "ready";
    listing.processingError = errors.length
      ? errors.map((e) => `${e.url}: ${e.error}`).join("; ")
      : "";
    await listing.save();
    await commitStatusSync(listing);
    return {
      success: true,
      duplicate: true,
      moderation: moderation.action,
      abuseScore: risk.abuseScore,
    };
  }

  await persistListingImages({ listing, images, modelId });

  const updatedImages = listing.images.map((li) => {
    const processed = images.find((pi) => pi.url === li.url || pi.s3Key === li.s3Key);
    if (processed) {
      return { ...li.toObject(), md5: processed.md5, phash: processed.phash };
    }
    return li.toObject();
  });

  listing.images = updatedImages;
  listing.processingStatus = "ready";
  listing.processingError = errors.length
    ? errors.map((e) => `${e.url}: ${e.error}`).join("; ")
    : "";
  await listing.save();
  await commitStatusSync(listing);

  await tryPostListingToTelegram(listing);

  const queryImages = images
    .filter((i) => i.embedding?.length)
    .map((i) => ({ url: i.url, embedding: i.embedding }));
  const embeddings = queryImages.map((i) => i.embedding);

  let matchesCreated = 0;

  const blockMatching =
    contentSafety.blockMatching || risk.blockMatching || contentSafety.action === "report";

  if (embeddings.length && !blockMatching && listing.status === "active") {
    const matchResult = await findListingMatches({
      listingId,
      listingType: listing.type,
      petType: listing.petType,
      embeddings,
      queryImages,
      userId: listing.userId,
      embeddingModel: modelId,
    });
    matchesCreated = matchResult.created;

    if (matchesCreated > 0) {
      await notifyListingMatches({ listingId });
    }
  }

  return {
    success: true,
    partialErrors: errors.length > 0,
    moderation: moderation.action,
    contentSafety: contentSafety.action,
    abuseScore: risk.abuseScore,
    matchesCreated,
  };
}
