import { Listing } from "@/models/listing";
import { LISTING_TYPES } from "@/config/constants/enums";

/**
 * Active listings within radius whose type differs from the source (cross-type matching).
 *
 * @param {Object} params
 * @param {number[]} params.coordinates [lng, lat]
 * @param {number} params.radiusKm
 * @param {string} params.sourceListingType
 * @param {string} params.petType
 * @param {import('mongoose').Types.ObjectId|string} [params.excludeListingId]
 * @param {string} [params.excludeUserId]
 */
export async function findCrossTypeListingsInRadius({
  coordinates,
  radiusKm,
  sourceListingType,
  petType,
  excludeListingId,
  excludeUserId,
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

  return Listing.find(query)
    .select("_id breed color type userId")
    .lean();
}
