/** Client helpers for `/api/listings/map` viewport fetches. */

import { MAP_LISTINGS_PAGE_SIZE } from "@/config/constants/platform";
import { quantizeCoord } from "@/lib/listings/quantize";

/**
 * Stable key for a viewport so tiny pans do not re-fetch.
 * @param {{ getWest: Function, getSouth: Function, getEast: Function, getNorth: Function }} bounds
 * @param {string} [type]
 * @param {string} [petType]
 */
export function boundsCacheKey(bounds, type, petType) {
  return [
    quantizeCoord(bounds.getWest()),
    quantizeCoord(bounds.getSouth()),
    quantizeCoord(bounds.getEast()),
    quantizeCoord(bounds.getNorth()),
    type || "",
    petType || "",
  ].join("|");
}

/**
 * @param {object} params
 * @param {import("leaflet").LatLngBounds} params.bounds
 * @param {string} [params.type]
 * @param {string} [params.petType]
 * @param {string} [params.cursor]
 * @param {boolean} [params.fresh]
 * @param {AbortSignal} [params.signal]
 * @param {number} [params.limit]
 */
export async function fetchMapListings({
  bounds,
  type,
  petType,
  cursor,
  fresh = false,
  signal,
  limit = MAP_LISTINGS_PAGE_SIZE,
}) {
  const params = new URLSearchParams({
    swLng: String(bounds.getWest()),
    swLat: String(bounds.getSouth()),
    neLng: String(bounds.getEast()),
    neLat: String(bounds.getNorth()),
    limit: String(limit),
  });
  if (type) params.set("type", type);
  if (petType) params.set("petType", petType);
  if (cursor) params.set("cursor", cursor);
  if (fresh) params.set("fresh", "1");

  const res = await fetch(`/api/listings/map?${params}`, { signal });
  if (!res.ok) {
    throw new Error("map_fetch_failed");
  }
  return res.json();
}

/**
 * Merge marker pages by listing id (load-more append).
 * @param {object[]} existing
 * @param {object[]} incoming
 */
export function mergeListingsById(existing, incoming) {
  const map = new Map(existing.map((l) => [l.id, l]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return [...map.values()];
}
