import { phashBitDistance } from "@/lib/intelligence/abuse/phash";
import { PHASH_DISTANCE_THRESHOLD } from "@/config/constants/enums";

/**
 * First 4 hex characters of a pHash — used to narrow candidate queries.
 *
 * @param {string} phash
 */
export function phashPrefix(phash) {
  return phash?.slice(0, 4) || "";
}

/**
 * Find near-duplicate images via prefix-bucketed pHash scan.
 *
 * @param {Object} params
 * @param {string} params.phash
 * @param {import("mongoose").Types.ObjectId|string} params.excludeListingId
 * @param {Date} params.since
 * @param {import("@/models/listing-image").ListingImage} ListingImageModel
 */
export async function findPhashMatches({ phash, excludeListingId, since, ListingImage }) {
  const prefix = phashPrefix(phash);
  if (!prefix) {
    return null;
  }

  const candidates = await ListingImage.find({
    phashPrefix: prefix,
    listingId: { $ne: excludeListingId },
    createdAt: { $gte: since },
    phash: { $exists: true, $ne: null },
  })
    .select("phash listingId")
    .lean();

  for (const candidate of candidates) {
    if (phashBitDistance(phash, candidate.phash) <= PHASH_DISTANCE_THRESHOLD) {
      return candidate;
    }
  }

  return null;
}
