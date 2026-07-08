import { connectDB } from "@/config/db";
import { Listing, attachListingPublicId } from "@/models/listing";
import { normalizeCountryCode } from "@/config/countries";
import { kmToMeters, isValidCoordinates } from "@/lib/geo";
import { makeVariantInsensitiveRegex } from "@/lib/text.js";

/**
 * Build the MongoDB match object shared by geo and non-geo listing searches.
 * Text search (`q`) is handled separately because $geoNear uses a nested `query` field.
 */
function buildListingMatch({
  status,
  type,
  petType,
  color,
  breed,
  country,
}) {
  const countryCode = normalizeCountryCode(country);

  return {
    status,
    ...(type && { type }),
    ...(petType && { petType }),
    ...(color && { color: makeVariantInsensitiveRegex(color) }),
    ...(breed && { breed: makeVariantInsensitiveRegex(breed) }),
    ...(countryCode && { "location.country": countryCode }),
  };
}

function normalizePage(page) {
  const n = Number(page);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/**
 * @typedef {object} ListingSearchResult
 * @property {object[]} listings
 * @property {number} total
 * @property {number} page
 * @property {number} limit
 * @property {number} totalPages
 */

/**
 * Search listings with optional pagination metadata.
 * @returns {Promise<ListingSearchResult>}
 */
export async function searchListings({
  type,
  petType,
  color,
  breed,
  country,
  status = "active",
  lng,
  lat,
  radiusKm,
  page = 1,
  limit = 20,
  q,
}) {
  await connectDB();

  const currentPage = normalizePage(page);
  const skip = (currentPage - 1) * limit;
  const match = buildListingMatch({ status, type, petType, color, breed, country });

  // Geo radius search — country filter stacks with lat/lng when both are set.
  if (isValidCoordinates(lng, lat) && radiusKm) {
    const query = { ...match };
    if (q) query.$text = { $search: q };

    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: kmToMeters(radiusKm),
          spherical: true,
          query,
        },
      },
      {
        $facet: {
          listings: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Listing.aggregate(pipeline);
    const listings = result?.listings ?? [];
    const total = result?.total?.[0]?.count ?? 0;

    return {
      listings: listings.map(attachListingPublicId),
      total,
      page: currentPage,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }

  const filter = {
    ...match,
    ...(q && { $text: { $search: q } }),
  };

  const [listings, total] = await Promise.all([
    Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Listing.countDocuments(filter),
  ]);

  return {
    listings: listings.map(attachListingPublicId),
    total,
    page: currentPage,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}
