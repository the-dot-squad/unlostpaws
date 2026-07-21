/** @file Upload rate limits — IP window and per-user daily caps (Redis, or in-memory in dev). */

import { env, resolveUploadRateLimitStore } from "@/config/env";

const UNKNOWN_IP_RATIO = 0.25;
const UPLOAD_DAY_TTL_SECONDS = 172_800;

/** Dev-only fixed-window counters keyed by Redis key string. */
const MEMORY = new Map();
const MEMORY_CAP = 10_000;

function sanitizeKeyPart(value) {
  return value.replace(/[^a-zA-Z0-9.:_-]/g, "_").slice(0, 128);
}

function uploadIpKey(ip) {
  return `rl:upload:ip:${sanitizeKeyPart(ip)}`;
}

function uploadDayKey(userId, prefix) {
  const d = new Date();
  const day = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `rl:upload:user:${sanitizeKeyPart(userId)}:${prefix}:${day}`;
}

function uploadIpLimit(ip) {
  const { maxRequests } = env.uploadRateLimit;
  if (ip === "unknown") return Math.max(1, Math.floor(maxRequests * UNKNOWN_IP_RATIO));
  return maxRequests;
}

function memoryIncr(key, windowSeconds) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  let entry = MEMORY.get(key);

  if (!entry || entry.windowStart <= windowStart) {
    if (MEMORY.size >= MEMORY_CAP) MEMORY.delete(MEMORY.keys().next().value);
    entry = { windowStart: now, count: 0 };
    MEMORY.set(key, entry);
  }

  entry.count += 1;
  return entry.count;
}

function memoryGet(key) {
  return MEMORY.get(key)?.count || 0;
}

function memoryIncrDaily(key) {
  let entry = MEMORY.get(key);
  if (!entry) {
    if (MEMORY.size >= MEMORY_CAP) MEMORY.delete(MEMORY.keys().next().value);
    entry = { count: 0 };
    MEMORY.set(key, entry);
  }
  entry.count += 1;
  return entry.count;
}

async function redisIncr(key, ttlSeconds) {
  const { ensureRedisConnection } = await import("@/lib/redis");
  const redis = await ensureRedisConnection();
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttlSeconds);
  return count;
}

async function redisGet(key) {
  const { ensureRedisConnection } = await import("@/lib/redis");
  const redis = await ensureRedisConnection();
  return Number(await redis.get(key)) || 0;
}

/**
 * Fixed-window upload IP limit. General `/api/*` is handled by Vercel Firewall.
 *
 * @param {string} ip
 */
export async function checkUploadIpRateLimit(ip) {
  const store = resolveUploadRateLimitStore();
  const { windowSeconds } = env.uploadRateLimit;
  const limit = uploadIpLimit(ip);

  if (store === "off") {
    return { allowed: true, limit, remaining: limit, retryAfterSeconds: windowSeconds };
  }

  const key = uploadIpKey(ip);
  const count =
    store === "memory" ? memoryIncr(key, windowSeconds) : await redisIncr(key, windowSeconds);

  if (count > limit) {
    return { allowed: false, limit, remaining: 0, retryAfterSeconds: windowSeconds };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: windowSeconds,
  };
}

/** Per-user daily upload count for listing images (read-only check). */
export async function getDailyUploadCount(userId, prefix) {
  const store = resolveUploadRateLimitStore();
  if (store === "off") return 0;

  const key = uploadDayKey(userId, prefix);
  if (store === "memory") return memoryGet(key);
  return redisGet(key);
}

/** Bump daily upload count after a successful presign. */
export async function incrementDailyUploadCount(userId, prefix) {
  const store = resolveUploadRateLimitStore();
  if (store === "off") return;

  const key = uploadDayKey(userId, prefix);
  if (store === "memory") {
    memoryIncrDaily(key);
    return;
  }
  await redisIncr(key, UPLOAD_DAY_TTL_SECONDS);
}
