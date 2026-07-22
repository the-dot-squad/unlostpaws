/** @file Viewport bounding-box search for the browse map. */

import mongoose from "mongoose";
import { connectDB } from "@/config/db";
import { Listing, listingPublicId } from "@/models/listing";
import { isValidCoordinates } from "@/lib/geo";
import {
  MAP_LISTINGS_LIMIT,
  MAP_LISTINGS_PAGE_SIZE,
} from "@/config/constants/platform";
import { cachedMap } from "@/lib/listings/cache";

/**
 * Validates a geographic bounding box.
 * MongoDB $box uses [[swLng, swLat], [neLng, neLat]] — lower-left then upper-right.
 *
 * @param {number} swLng
 * @param {number} swLat
 * @param {number} neLng
 * @param {number} neLat
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
 * Encode a cursor for newest-first pagination within a viewport.
 * @param {{ createdAt: Date, _id: import("mongoose").Types.ObjectId }} doc
 * @returns {string}
 */
export function encodeMapCursor(doc) {
  return `${new Date(doc.createdAt).toISOString()}_${doc._id.toString()}`;
}

/**
 * @param {string} [cursor]
 * @returns {{ createdAt: Date, id: import("mongoose").Types.ObjectId } | null}
 */
export function decodeMapCursor(cursor) {
  if (!cursor || typeof cursor !== "string") return null;
  const sep = cursor.lastIndexOf("_");
  if (sep <= 0) return null;
  const iso = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);
  const createdAt = new Date(iso);
  if (!Number.isFinite(createdAt.getTime()) || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return { createdAt, id: new mongoose.Types.ObjectId(id) };
}

/**
 * Clamp map page size to platform bounds.
 * @param {number} [limit]
 * @returns {number}
 */
export function clampMapLimit(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return MAP_LISTINGS_PAGE_SIZE;
  return Math.min(MAP_LISTINGS_LIMIT, Math.floor(n));
}

/**
 * Pick the lowest-order image URL without shipping the full images array to clients.
 * @param {{ url?: string, order?: number }[]} [images]
 * @returns {string | null}
 */
function firstThumbnailUrl(images) {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return sorted[0]?.url || null;
}

/**
 * Fetch active listings within a map viewport bounding box (slim marker payload).
 *
 * Sort + geo may sort in memory within the boxed candidate set; the 2dsphere index
 * still bounds the geo scan. Prefer zooming in when hasMore is true.
 *
 * @param {object} params
 * @param {number} params.swLng
 * @param {number} params.swLat
 * @param {number} params.neLng
 * @param {number} params.neLat
 * @param {string} [params.type]
 * @param {string} [params.petType]
 * @param {number} [params.limit]
 * @param {string} [params.cursor]
 * @param {boolean} [params.skipCache] Bypass Redis (explicit refresh)
 * @returns {Promise<{
 *   listings: object[],
 *   truncated: boolean,
 *   hasMore: boolean,
 *   nextCursor: string | null,
 *   limit: number,
 * }>}
 */
export async function fetchListingsInBounds({
  swLng,
  swLat,
  neLng,
  neLat,
  type,
  petType,
  limit: rawLimit,
  cursor,
  skipCache = false,
}) {
  const limit = clampMapLimit(rawLimit);

  if (!isValidBounds(swLng, swLat, neLng, neLat)) {
    return {
      listings: [],
      truncated: false,
      hasMore: false,
      nextCursor: null,
      limit,
    };
  }

  return cachedMap({
    swLng,
    swLat,
    neLng,
    neLat,
    type,
    petType,
    limit,
    cursor,
    skipCache,
    loader: () =>
      queryListingsInBounds({
        swLng,
        swLat,
        neLng,
        neLat,
        type,
        petType,
        limit,
        cursor,
      }),
  });
}

/**
 * @param {object} params
 * @param {number} params.swLng
 * @param {number} params.swLat
 * @param {number} params.neLng
 * @param {number} params.neLat
 * @param {string} [params.type]
 * @param {string} [params.petType]
 * @param {number} params.limit
 * @param {string} [params.cursor]
 */
async function queryListingsInBounds({
  swLng,
  swLat,
  neLng,
  neLat,
  type,
  petType,
  limit,
  cursor,
}) {
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

  const decoded = decodeMapCursor(cursor);
  if (decoded) {
    // Newest-first: (createdAt, _id) strictly less than the cursor pair.
    filter.$or = [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ];
  }

  // Slim projection: only url/order from images (not md5/bytes/s3Key).
  const results = await Listing.find(filter)
    .select(
      "type petType color breed location.coordinates location.city location.country createdAt images.url images.order"
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = results.length > limit;
  const page = hasMore ? results.slice(0, limit) : results;
  const last = page[page.length - 1];

  return {
    listings: page.map((listing) => {
      const [lng, lat] = listing.location.coordinates;
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
        thumbnailUrl: firstThumbnailUrl(listing.images),
      };
    }),
    // truncated kept for older clients; same meaning as hasMore on first page.
    truncated: hasMore && !decoded,
    hasMore,
    nextCursor: hasMore && last ? encodeMapCursor(last) : null,
    limit,
  };
}
