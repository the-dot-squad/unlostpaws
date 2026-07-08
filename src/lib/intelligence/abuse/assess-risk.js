import { connectDB } from "@/config/db";
import { Listing, listingPublicId } from "@/models/listing";
import { getAppSettings } from "@/lib/services/settings";
import {
  checkDuplicateImageSignals,
  checkEmbeddingSignals,
  checkMetadataRepostSignals,
} from "./assess-risk-signals";

/**
 * @typedef {Object} AbuseSignal
 * @property {string} code
 * @property {number} weight
 * @property {string} detail
 */

/**
 * @typedef {Object} RelatedListingEvidence
 * @property {import("mongoose").Types.ObjectId} listingId
 * @property {string} publicId
 * @property {"duplicate_of"|"similar_to"} relationship
 * @property {number} score
 * @property {string} listingType
 * @property {string} listingStatus
 */

/**
 * Composite abuse risk assessment for a newly processed listing.
 *
 * @param {Object} params
 * @param {import("mongoose").Document} params.listing
 * @param {Array<{ md5?: string, phash?: string, embedding?: number[] }>} params.images
 * @param {string} params.embeddingModel
 */
export async function assessAbuseRisk({ listing, images, embeddingModel }) {
  await connectDB();
  const settings = await getAppSettings();
  const lookbackDays = settings.dedupLookbackDays ?? 365;
  const repostDays = settings.sameUserRepostLookbackDays ?? 30;
  const since = new Date(Date.now() - lookbackDays * 86400000);
  const repostSince = new Date(Date.now() - repostDays * 86400000);

  /** @type {AbuseSignal[]} */
  const signals = [];
  /** @type {RelatedListingEvidence[]} */
  const relatedListings = [];

  const embeddings = images.filter((i) => i.embedding?.length).map((i) => i.embedding);

  const duplicateResult = await checkDuplicateImageSignals({
    listing,
    images,
    since,
    signals,
    relatedListings,
    addRelatedListing,
  });

  let abuseScore = duplicateResult.abuseScore;
  const hasMd5Match = duplicateResult.hasMd5Match;

  abuseScore = Math.max(
    abuseScore,
    await checkEmbeddingSignals({
      listing,
      embeddings,
      embeddingModel,
      hasMd5Match,
      signals,
      relatedListings,
      addRelatedListing,
    })
  );

  abuseScore = Math.max(
    abuseScore,
    await checkMetadataRepostSignals({
      listing,
      repostSince,
      signals,
      relatedListings,
      addRelatedListing,
    })
  );

  const reviewThreshold = settings.abuseReviewThreshold ?? 0.82;

  const blockMatching =
    hasMd5Match ||
    abuseScore >= reviewThreshold ||
    signals.some((s) =>
      ["md5_exact", "phash_near_duplicate", "same_user_embedding", "same_type_similar"].includes(
        s.code
      )
    );

  return {
    abuseScore,
    signals,
    relatedListings: dedupeRelated(relatedListings),
    blockMatching,
    hasMd5Match,
  };
}

/**
 * @param {RelatedListingEvidence[]} list
 * @param {import("mongoose").Types.ObjectId|string} listingId
 */
async function addRelatedListing(list, listingId, relationship, score) {
  const id = String(listingId);
  if (list.some((r) => String(r.listingId) === id)) {
    return;
  }

  const doc = await Listing.findById(listingId).select("type status").lean();
  if (!doc) return;

  list.push({
    listingId: doc._id,
    publicId: listingPublicId(doc),
    relationship,
    score,
    listingType: doc.type,
    listingStatus: doc.status,
  });
}

/** @param {RelatedListingEvidence[]} list */
function dedupeRelated(list) {
  const seen = new Map();
  for (const item of list) {
    const key = String(item.listingId);
    const existing = seen.get(key);
    if (!existing || item.score > existing.score) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}
