/** @file Mongo geo candidates for cross-type matching (capped). */

import { Listing } from "@/models/listing";
import { LISTING_TYPES } from "@/config/constants/enums";
import { GEO_MATCH_CANDIDATE_CAP } from "@/config/constants/platform";

/**
 * Active listings within radius whose type differs from the source (cross-type matching).
 *
 * Hard-capped so Qdrant ANN never receives an unbounded `listingIds` filter.
 * Peak cost downstream: ≤ GEO_MATCH_CANDIDATE_CAP ids × ceil(ids/100) Qdrant
 * batches per query embedding.
 *
 * @param {Object} params
 * @param {number[]} params.coordinates [lng, lat]
 * @param {number} params.radiusKm
 * @param {string} params.sourceListingType
 * @param {string} params.petType
 * @param {import('mongoose').Types.ObjectId|string} [params.excludeListingId]
 * @param {string} [params.excludeUserId]
 * @param {number} [params.limit]
 */
export async function findCrossTypeListingsInRadius({
  coordinates,
  radiusKm,
  sourceListingType,
  petType,
  excludeListingId,
  excludeUserId,
  limit = GEO_MATCH_CANDIDATE_CAP,
}) {
  if (!coordinates?.length || !radiusKm || !sourceListingType) {
    return [];
  }

  const crossTypes = LISTING_TYPES.filter((t) => t !== sourceListingType);
  if (!crossTypes.length) {
    return [];
  }

  const query = {
    status: "active",
    type: { $in: crossTypes },
    "location.coordinates": {
      $geoWithin: {
        $centerSphere: [coordinates, radiusKm / 6378.1],
      },
    },
  };

  if (petType) {
    query.petType = petType;
  }

  if (excludeListingId) {
    query._id = { $ne: excludeListingId };
  }

  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }

  const cap = Math.max(1, Math.min(Number(limit) || GEO_MATCH_CANDIDATE_CAP, GEO_MATCH_CANDIDATE_CAP));

  return Listing.find(query)
    .select("_id breed color type userId")
    .limit(cap)
    .lean();
}
