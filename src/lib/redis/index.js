/** @file Shared Upstash Redis client for ML job queue, upload IP rate limits, and health probes. */

import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

/** @returns {boolean} Whether Upstash Redis REST credentials are configured. */
export function hasRedis() {
  return Boolean(env.redis.url && env.redis.token);
}

let sharedConnection = null;

/** Lazy singleton `@upstash/redis` client (stateless HTTP — no connect/disconnect lifecycle). */
export function getRedisConnection() {
  if (!env.redis.url || !env.redis.token) {
    throw new Error("Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
  }

  if (!sharedConnection) {
    sharedConnection = new Redis({
      url: env.redis.url,
      token: env.redis.token,
    });
  }

  return sharedConnection;
}

/** @returns {Promise<Redis>} */
export async function ensureRedisConnection() {
  return getRedisConnection();
}

/**
 * Upstash `XINFO GROUPS` — not `xinfo("GROUPS", key)` (ioredis argument order).
 * @param {string} stream
 */
export async function xinfoGroups(stream) {
  const redis = getRedisConnection();
  return redis.xinfo(stream, { type: "GROUPS" });
}

/**
 * @template T
 * @param {(client: Redis) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withRedisClient(fn) {
  return fn(getRedisConnection());
}
