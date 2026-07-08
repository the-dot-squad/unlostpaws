import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { ListingImage } from "@/models/listing-image";
import { ListingMatch } from "@/models/listing-match";
import { getAppSettings } from "@/lib/services/settings";
import { metadataScore } from "@/lib/intelligence/matching/metadata-score";
import {
  matchTierForTypes,
  thresholdForPair,
  isCrossTypePair,
  canonicalListingPair,
} from "@/lib/intelligence/matching/pairs";
import { searchListingImages } from "@/lib/qdrant/listing-images";
import { LISTING_TYPES } from "@/config/constants/enums";

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
  const crossTypes = LISTING_TYPES.filter((t) => t !== listingType);
  const center = coords?.length === 2 ? { lat: coords[1], lon: coords[0] } : null;

  const highThreshold = settings.matchConfidenceHighThreshold ?? 0.9;

  // 1. Fetch source listing's image MD5s once outside the loop
  const sourceImages = await ListingImage.find({ listingId }).select("md5").lean();
  const sourceMd5s = new Set(sourceImages.map((img) => img.md5).filter(Boolean));

  const bestByListing = new Map();

  for (let qi = 0; qi < embeddings.length; qi++) {
    const hits = await searchListingImages({
      vector: embeddings[qi],
      embeddingModel,
      petType,
      listingType: crossTypes[0],
      center,
      radiusKm: settings.geoMatchRadiusKm,
      excludeListingId: listingId,
      excludeUserId: userId,
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

  const matchListingIds = [...bestByListing.keys()];
  if (!matchListingIds.length) {
    return { created: 0 };
  }

  // Fetch the candidate listings' metadata and MD5s in batch queries
  const [candidates, candidateImages] = await Promise.all([
    Listing.find({ _id: { $in: matchListingIds }, status: "active" }).lean(),
    ListingImage.find({ listingId: { $in: matchListingIds } }).select("listingId md5").lean(),
  ]);

  const candidateMeta = new Map(candidates.map((c) => [c._id.toString(), c]));

  // Group candidate MD5s by listingId in memory
  const candidateMd5sByListing = new Map();
  for (const img of candidateImages) {
    const lid = String(img.listingId);
    if (!candidateMd5sByListing.has(lid)) {
      candidateMd5sByListing.set(lid, new Set());
    }
    if (img.md5) {
      candidateMd5sByListing.get(lid).add(img.md5);
    }
  }

  const matchCandidates = [];
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

    // Check if they share any identical image MD5 using the sets in memory (reduces DB queries)
    const candidateMd5Set = candidateMd5sByListing.get(String(match.listingId)) || new Set();
    const hasSharedMd5 = [...sourceMd5s].some((md5) => candidateMd5Set.has(md5));
    if (hasSharedMd5) {
      continue;
    }

    const [listingAId, listingBId] = canonicalListingPair(listingId, match.listingId);
    matchCandidates.push({
      match,
      candidate,
      listingAId,
      listingBId,
      tier,
      metaScore,
      finalScore,
    });
  }

  if (!matchCandidates.length) {
    return { created: 0 };
  }

  const orClauses = matchCandidates.map((c) => ({
    listingAId: c.listingAId,
    listingBId: c.listingBId,
  }));
  const existingMatches = await ListingMatch.find({ $or: orClauses }).select("listingAId listingBId").lean();
  const existingMatchesSet = new Set(existingMatches.map((em) => `${em.listingAId}_${em.listingBId}`));

  let created = 0;

  for (const item of matchCandidates) {
    const key = `${item.listingAId}_${item.listingBId}`;
    if (existingMatchesSet.has(key)) {
      continue;
    }

    const isSourceA = String(item.listingAId) === String(listingId);
    const listingAUserId = isSourceA ? userId : item.candidate.userId;
    const listingBUserId = isSourceA ? item.candidate.userId : userId;
    const listingAType = isSourceA ? listingType : item.candidate.type;
    const listingBType = isSourceA ? item.candidate.type : listingType;

    const missingListingId =
      listingType === "missing"
        ? listingId
        : item.candidate.type === "missing"
          ? item.match.listingId
          : null;
    const counterpartListingId = missingListingId
      ? String(missingListingId) === String(listingId)
        ? item.match.listingId
        : listingId
      : null;

    await ListingMatch.create({
      listingAId: item.listingAId,
      listingBId: item.listingBId,
      listingAUserId,
      listingBUserId,
      listingAType,
      listingBType,
      missingListingId,
      counterpartListingId,
      tier: item.tier,
      sourceListingId: listingId,
      embeddingScore: item.match.embeddingScore,
      metadataScore: item.metaScore,
      finalScore: item.finalScore,
      confidenceTier: item.finalScore >= highThreshold ? "high" : "medium",
      matchedImageAUrl:
        String(item.listingAId) === String(listingId)
          ? item.match.matchedQueryImageUrl
          : item.match.matchedCandidateImageUrl,
      matchedImageBUrl:
        String(item.listingBId) === String(listingId)
          ? item.match.matchedQueryImageUrl
          : item.match.matchedCandidateImageUrl,
      status: "pending",
    });

    created += 1;
  }

  return { created };
}
