/** @file Short-TTL Redis cache for map / geo-browse listing queries.
 *
 * Version key (`listings:geo:v`) invalidates all entries via INCR — no SCAN/DEL
 * of individual keys (Upstash-friendly). Redis key prefixes stay stable across deploys.
 */

import { hasRedis, ensureRedisConnection } from "@/lib/redis";
import { LISTINGS_CACHE_TTL_SEC } from "@/config/constants/platform";
import { quantizeCoord } from "@/lib/listings/quantize";

const VERSION_KEY = "listings:geo:v";
const MAP_PREFIX = "listings:geo:map";
const BROWSE_PREFIX = "listings:geo:browse";

/**
 * @returns {Promise<string>}
 */
async function readVersion() {
  if (!hasRedis()) return "0";
  try {
    const redis = await ensureRedisConnection();
    const v = await redis.get(VERSION_KEY);
    return v != null ? String(v) : "0";
  } catch {
    return "0";
  }
}

/**
 * Bump the shared geo-cache version so all map/browse entries miss on next read.
 * Safe no-op when Redis is unavailable.
 */
export async function invalidateGeoCache() {
  if (!hasRedis()) return;
  try {
    const redis = await ensureRedisConnection();
    await redis.incr(VERSION_KEY);
  } catch (err) {
    console.error("[listings-cache] invalidate failed:", err?.message || err);
  }
}

/**
 * @param {string} prefix
 * @param {Record<string, string | number | boolean | null | undefined>} parts
 */
async function buildKey(prefix, parts) {
  const version = await readVersion();
  const body = Object.entries(parts)
    .map(([k, v]) => `${k}=${v == null || v === "" ? "-" : String(v)}`)
    .join("&");
  return `${prefix}:${version}:${body}`;
}

/**
 * @template T
 * @param {object} params
 * @param {string} params.prefix
 * @param {Record<string, string | number | boolean | null | undefined>} params.parts
 * @param {() => Promise<T>} params.loader
 * @param {boolean} [params.skipCache]
 * @returns {Promise<T>}
 */
async function withGeoCache({ prefix, parts, loader, skipCache = false }) {
  if (skipCache || !hasRedis()) {
    return loader();
  }

  let redis;
  let key;
  try {
    redis = await ensureRedisConnection();
    key = await buildKey(prefix, parts);
    const hit = await redis.get(key);
    if (hit != null) {
      return typeof hit === "string" ? JSON.parse(hit) : hit;
    }
  } catch (err) {
    console.error("[listings-cache] read failed:", err?.message || err);
    return loader();
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), { ex: LISTINGS_CACHE_TTL_SEC });
  } catch (err) {
    console.error("[listings-cache] write failed:", err?.message || err);
  }

  return value;
}

/**
 * Cache wrapper for map viewport queries.
 * @template T
 * @param {object} params
 * @param {number} params.swLng
 * @param {number} params.swLat
 * @param {number} params.neLng
 * @param {number} params.neLat
 * @param {string} [params.type]
 * @param {string} [params.petType]
 * @param {number} params.limit
 * @param {string} [params.cursor]
 * @param {boolean} [params.skipCache]
 * @param {() => Promise<T>} params.loader
 * @returns {Promise<T>}
 */
export async function cachedMap({
  swLng,
  swLat,
  neLng,
  neLat,
  type,
  petType,
  limit,
  cursor,
  skipCache,
  loader,
}) {
  return withGeoCache({
    prefix: MAP_PREFIX,
    parts: {
      swLng: quantizeCoord(swLng),
      swLat: quantizeCoord(swLat),
      neLng: quantizeCoord(neLng),
      neLat: quantizeCoord(neLat),
      type,
      petType,
      limit,
      cursor: cursor || "",
    },
    loader,
    skipCache,
  });
}

/**
 * Cache wrapper for browse `$geoNear` listing searches.
 * @template T
 * @param {object} params
 * @param {number} params.lng
 * @param {number} params.lat
 * @param {number} params.radiusKm
 * @param {string} [params.type]
 * @param {string} [params.petType]
 * @param {string} [params.color]
 * @param {string} [params.breed]
 * @param {string} [params.country]
 * @param {string} [params.status]
 * @param {string} [params.q]
 * @param {number} params.page
 * @param {number} params.limit
 * @param {() => Promise<T>} params.loader
 * @returns {Promise<T>}
 */
export async function cachedBrowse({
  lng,
  lat,
  radiusKm,
  type,
  petType,
  color,
  breed,
  country,
  status,
  q,
  page,
  limit,
  loader,
}) {
  return withGeoCache({
    prefix: BROWSE_PREFIX,
    parts: {
      lng: quantizeCoord(lng, 4),
      lat: quantizeCoord(lat, 4),
      radiusKm,
      type,
      petType,
      color,
      breed,
      country,
      status,
      q,
      page,
      limit,
    },
    loader,
  });
}
