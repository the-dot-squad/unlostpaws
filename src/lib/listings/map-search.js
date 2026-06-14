import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { listingPublicId } from "@/models/listing";
import { isValidCoordinates } from "@/lib/geo";
import { MAP_LISTINGS_LIMIT } from "@/config/constants/platform";

/**
 * Validates a geographic bounding box.
 * MongoDB $box uses [[swLng, swLat], [neLng, neLat]] — lower-left then upper-right.
 * Leaflet's getBounds() returns the same corner semantics but uses LatLng objects.
 *
 * @param {number} swLng Southwest longitude
 * @param {number} swLat Southwest latitude
 * @param {number} neLng Northeast longitude
 * @param {number} neLat Northeast latitude
 * @returns {boolean}
 */
export function isValidBounds(swLng, swLat, neLng, neLat) {
  return (
    isValidCoordinates(swLng, swLat) &&
    isValidCoordinates(neLng, neLat) &&
    swLng <= neLng &&
    swLat <= neLat
  );
}

/**
 * Fetch active listings within a map viewport bounding box.
 *
 * @param {object} params
 * @param {number} params.swLng Southwest corner longitude
 * @param {number} params.swLat Southwest corner latitude
 * @param {number} params.neLng Northeast corner longitude
 * @param {number} params.neLat Northeast corner latitude
 * @param {string} [params.type] Listing type filter
 * @param {string} [params.petType] Pet type filter
 * @param {number} [params.limit=500] Max results returned
 * @returns {Promise<{ listings: object[], truncated: boolean }>}
 */
export async function fetchListingsInBounds({
  swLng,
  swLat,
  neLng,
  neLat,
  type,
  petType,
  limit = MAP_LISTINGS_LIMIT,
}) {
  if (!isValidBounds(swLng, swLat, neLng, neLat)) {
    return { listings: [], truncated: false };
  }

  await connectDB();

  const filter = {
    status: "active",
    "location.coordinates": {
      $geoWithin: {
        $box: [
          [swLng, swLat],
          [neLng, neLat],
        ],
      },
    },
    ...(type && { type }),
    ...(petType && { petType }),
  };

  const results = await Listing.find(filter)
    .select("type petType color breed location images")
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const truncated = results.length > limit;
  const listings = truncated ? results.slice(0, limit) : results;

  return {
    listings: listings.map((listing) => {
      const [lng, lat] = listing.location.coordinates;
      const thumb = [...(listing.images || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      )[0];

      return {
        id: listingPublicId(listing),
        type: listing.type,
        petType: listing.petType,
        color: listing.color,
        breed: listing.breed || "",
        lng,
        lat,
        city: listing.location.city || "",
        country: listing.location.country || "",
        thumbnailUrl: thumb?.url || null,
      };
    }),
    truncated,
  };
}

