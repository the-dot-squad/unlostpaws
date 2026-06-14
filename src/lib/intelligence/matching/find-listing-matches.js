import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { ListingImage } from "@/models/listing-image";
import { ListingMatch } from "@/models/listing-match";
import { getAppSettings } from "@/lib/services/settings";
import { findCrossTypeListingsInRadius } from "@/lib/intelligence/geo-filter";
import { metadataScore } from "@/lib/intelligence/matching/metadata-score";
import {
  matchTierForTypes,
  thresholdForPair,
  isCrossTypePair,
  canonicalListingPair,
} from "@/lib/intelligence/matching/pairs";
import { searchListingImages } from "@/lib/qdrant/listing-images";

/**
 * @param {import("mongoose").Types.ObjectId|string} listingAId
 * @param {import("mongoose").Types.ObjectId|string} listingBId
 */
async function shareIdenticalImageMd5(listingAId, listingBId) {
  const [aImages, bImages] = await Promise.all([
    ListingImage.find({ listingId: listingAId }).select("md5").lean(),
    ListingImage.find({ listingId: listingBId }).select("md5").lean(),
  ]);

  const bSet = new Set(bImages.map((i) => i.md5).filter(Boolean));
  return aImages.some((i) => i.md5 && bSet.has(i.md5));
}

/**
 * Score and persist cross-type listing matches for a processed listing.
 *
 * @param {Object} params
 * @param {import("mongoose").Types.ObjectId|string} params.listingId
 * @param {string} params.listingType
 * @param {string} params.petType
 * @param {number[][]} params.embeddings
 * @param {Array<{ url: string }>} params.queryImages
 * @param {string} params.userId
 * @param {string} params.embeddingModel
 */
export async function findListingMatches({
  listingId,
  listingType,
  petType,
  embeddings,
  queryImages,
  userId,
  embeddingModel,
}) {
  const settings = await getAppSettings();
  if (!settings.imageMatchingEnabled || !embeddings?.length || !embeddingModel) {
    return { created: 0 };
  }

  await connectDB();

  const sourceListing = await Listing.findById(listingId);
  if (!sourceListing || sourceListing.status !== "active") {
    return { created: 0 };
  }

  const coords = sourceListing.location?.coordinates;
  const candidatesInGeo = await findCrossTypeListingsInRadius({
    coordinates: coords,
    radiusKm: settings.geoMatchRadiusKm,
    sourceListingType: listingType,
    petType,
    excludeListingId: listingId,
    excludeUserId: userId,
  });

  if (!candidatesInGeo.length) {
    return { created: 0 };
  }

  const candidateIds = candidatesInGeo.map((c) => c._id);
  const candidateMeta = new Map(candidatesInGeo.map((c) => [c._id.toString(), c]));
  const highThreshold = settings.matchConfidenceHighThreshold ?? 0.9;

  const bestByListing = new Map();

  for (let qi = 0; qi < embeddings.length; qi++) {
    const hits = await searchListingImages({
      vector: embeddings[qi],
      embeddingModel,
      petType,
      listingIds: candidateIds,
      limit: 50,
      scoreThreshold: (settings.matchSimilarityThreshold ?? 0.82) * 0.9,
    });

    for (const hit of hits) {
      const existing = bestByListing.get(hit.listingId);
      if (!existing || hit.score > existing.embeddingScore) {
        bestByListing.set(hit.listingId, {
          listingId: hit.listingId,
          embeddingScore: hit.score,
          matchedQueryImageUrl: queryImages[qi]?.url || null,
          matchedCandidateImageUrl: hit.url,
        });
      }
    }
  }

  let created = 0;

  for (const match of bestByListing.values()) {
    const candidate = candidateMeta.get(String(match.listingId));
    if (!candidate) continue;

    if (!isCrossTypePair(listingType, candidate.type)) continue;
    if (candidate.userId === userId) continue;

    const tier = matchTierForTypes(listingType, candidate.type);
    if (!tier) continue;

    const pairThreshold = thresholdForPair(settings, listingType, candidate.type);
    const minEmbedding = pairThreshold * 0.9;
    const metaScore = metadataScore(sourceListing, candidate);
    const finalScore = match.embeddingScore * 0.75 + metaScore * 0.25;

    if (match.embeddingScore < minEmbedding || finalScore < pairThreshold) {
      continue;
    }

    const [listingAId, listingBId] = canonicalListingPair(listingId, match.listingId);

    if (await shareIdenticalImageMd5(listingAId, listingBId)) {
      continue;
    }

    const isSourceA = String(listingAId) === String(listingId);
    const listingAUserId = isSourceA ? userId : candidate.userId;
    const listingBUserId = isSourceA ? candidate.userId : userId;
    const listingAType = isSourceA ? listingType : candidate.type;
    const listingBType = isSourceA ? candidate.type : listingType;

    const existing = await ListingMatch.findOne({ listingAId, listingBId });
    if (existing) {
      continue;
    }

    const missingListingId =
      listingType === "missing"
        ? listingId
        : candidate.type === "missing"
          ? match.listingId
          : null;
    const counterpartListingId = missingListingId
      ? String(missingListingId) === String(listingId)
        ? match.listingId
        : listingId
      : null;

    await ListingMatch.create({
      listingAId,
      listingBId,
      listingAUserId,
      listingBUserId,
      listingAType,
      listingBType,
      missingListingId,
      counterpartListingId,
      tier,
      sourceListingId: listingId,
      embeddingScore: match.embeddingScore,
      metadataScore: metaScore,
      finalScore,
      confidenceTier: finalScore >= highThreshold ? "high" : "medium",
      matchedImageAUrl:
        String(listingAId) === String(listingId)
          ? match.matchedQueryImageUrl
          : match.matchedCandidateImageUrl,
      matchedImageBUrl:
        String(listingBId) === String(listingId)
          ? match.matchedQueryImageUrl
          : match.matchedCandidateImageUrl,
      status: "pending",
    });

    created += 1;
  }

  return { created };
}
