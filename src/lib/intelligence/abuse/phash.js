/** @file Perceptual hash helpers for near-duplicate image detection. */

import { PHASH_DISTANCE_THRESHOLD } from "@/config/constants/enums";

/**
 * Bit-level Hamming distance between two pHash hex strings.
 *
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function phashBitDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) {
    return Infinity;
  }

  try {
    const xor = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
    return xor.toString(2).replace(/0/g, "").length;
  } catch {
    return Infinity;
  }
}

/**
 * First 4 hex characters of a pHash — narrows candidate queries.
 *
 * @param {string} phash
 * @returns {string}
 */
export function phashPrefix(phash) {
  return phash?.slice(0, 4) || "";
}

/**
 * Find a near-duplicate image via prefix-bucketed pHash scan.
 *
 * @param {Object} params
 * @param {string} params.phash
 * @param {import("mongoose").Types.ObjectId|string} params.excludeListingId
 * @param {Date} params.since
 * @param {import("mongoose").Model} params.ListingImage
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
