import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { ListingImage } from "@/models/listing-image";
import { getAppSettings } from "@/lib/services/settings";
import { listingPublicId } from "@/models/listing";
import { findPhashMatches } from "@/lib/intelligence/abuse/phash-buckets";
import { descriptionOverlap } from "@/lib/intelligence/matching/metadata-score";
import { searchListingImagesByUser, searchSameTypeListingImages } from "@/lib/qdrant/listing-images";

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
 * Haversine distance in km between two [lng, lat] points.
 *
 * @param {number[]} a
 * @param {number[]} b
 */
function geoDistanceKm(a, b) {
  if (!a?.length || !b?.length) return Infinity;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Composite abuse risk assessment for a newly processed listing.
 *
 * @param {Object} params
 * @param {import("mongoose").Document} params.listing
 * @param {Array<{ md5?: string, phash?: string, embedding?: number[] }>} params.images
 * @param {string} params.embeddingModel
 * @returns {Promise<{
 *   abuseScore: number,
 *   signals: AbuseSignal[],
 *   relatedListings: RelatedListingEvidence[],
 *   blockMatching: boolean,
 *   hasMd5Match: boolean,
 * }>}
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
  let abuseScore = 0;
  let hasMd5Match = false;

  const embeddings = images.filter((i) => i.embedding?.length).map((i) => i.embedding);

  for (const img of images) {
    if (img.md5) {
      const md5Match = await ListingImage.findOne({
        md5: img.md5,
        listingId: { $ne: listing._id },
      }).lean();

      if (md5Match) {
        hasMd5Match = true;
        abuseScore = 1;
        signals.push({
          code: "md5_exact",
          weight: 1,
          detail: `Identical image bytes (MD5) match listing ${md5Match.listingId}`,
        });
        await addRelatedListing(relatedListings, md5Match.listingId, "duplicate_of", 1);
        break;
      }
    }

    if (img.phash && abuseScore < 1) {
      const phashMatch = await findPhashMatches({
        phash: img.phash,
        excludeListingId: listing._id,
        since,
        ListingImage,
      });

      if (phashMatch) {
        abuseScore = Math.max(abuseScore, 0.92);
        signals.push({
          code: "phash_near_duplicate",
          weight: 0.92,
          detail: `Perceptual hash match (listing ${phashMatch.listingId})`,
        });
        await addRelatedListing(relatedListings, phashMatch.listingId, "duplicate_of", 0.92);
      }
    }
  }

  if (!hasMd5Match && embeddings.length && embeddingModel) {
    const ownHits = await searchListingImagesByUser({
      vector: embeddings[0],
      userId: listing.userId,
      petType: listing.petType,
      embeddingModel,
      excludeListingId: listing._id,
      limit: 5,
      scoreThreshold: 0.95,
    });

    for (const hit of ownHits) {
      abuseScore = Math.max(abuseScore, Math.min(1, 0.45 + hit.score * 0.55));
      signals.push({
        code: "same_user_embedding",
        weight: hit.score,
        detail: `High embedding similarity (${Math.round(hit.score * 100)}%) to own listing ${hit.listingId}`,
      });
      await addRelatedListing(relatedListings, hit.listingId, "similar_to", hit.score);
    }

    const sameTypeHits = await searchSameTypeListingImages({
      vector: embeddings[0],
      listingType: listing.type,
      petType: listing.petType,
      embeddingModel,
      excludeListingId: listing._id,
      excludeUserId: listing.userId,
      limit: 10,
      scoreThreshold: 0.88,
    });

    for (const hit of sameTypeHits) {
      if (hit.score < 0.88) continue;

      const candidate = await Listing.findById(hit.listingId)
        .select("breed color location type status")
        .lean();
      if (!candidate) continue;

      const dist = geoDistanceKm(
        listing.location?.coordinates,
        candidate.location?.coordinates
      );
      if (dist > 20) continue;

      const bump = 0.4 + hit.score * 0.1;
      abuseScore = Math.max(abuseScore, Math.min(1, bump));
      signals.push({
        code: "same_type_similar",
        weight: hit.score,
        detail: `Same-type listing similarity ${Math.round(hit.score * 100)}% within ${Math.round(dist)} km`,
      });
      await addRelatedListing(relatedListings, hit.listingId, "similar_to", hit.score);
    }
  }

  const priorSameUser = await Listing.find({
    userId: listing.userId,
    _id: { $ne: listing._id },
    petType: listing.petType,
    color: listing.color,
    createdAt: { $gte: repostSince },
    status: { $in: ["active", "under_review"] },
  })
    .select("_id location type status")
    .lean();

  for (const prior of priorSameUser) {
    const dist = geoDistanceKm(listing.location?.coordinates, prior.location?.coordinates);
    if (dist <= 5) {
      abuseScore = Math.max(abuseScore, 0.75);
      signals.push({
        code: "same_user_metadata_geo",
        weight: 0.35,
        detail: `Same petType/color within ${Math.round(dist)} km of prior listing ${prior._id}`,
      });
      await addRelatedListing(relatedListings, prior._id, "similar_to", 0.75);
    }
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const priorDescriptions = await Listing.find({
    userId: listing.userId,
    _id: { $ne: listing._id },
    createdAt: { $gte: weekAgo },
    description: { $exists: true, $ne: "" },
  })
    .select("_id description type status")
    .lean();

  for (const prior of priorDescriptions) {
    const overlap = descriptionOverlap(listing, prior);
    if (overlap >= 0.8) {
      abuseScore = Math.max(abuseScore, 0.65);
      signals.push({
        code: "same_user_description",
        weight: overlap,
        detail: `Description overlap ${Math.round(overlap * 100)}% with listing ${prior._id}`,
      });
      await addRelatedListing(relatedListings, prior._id, "similar_to", overlap);
    }
  }

  const reportThreshold = settings.abuseReportThreshold ?? 0.7;
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
