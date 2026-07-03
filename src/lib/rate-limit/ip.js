/** @file IP rate limiting — proxy and Redis-backed API checks via REDIS_URL. */

import { NextResponse } from "next/server";
import { env, resolveIpRateLimitStore } from "@/config/env";
import { getClientIpFromRequest, hasValidInternalSecret, safeEqual } from "@/lib/request-metadata";

const UNKNOWN_IP_RATIO = 0.25;
const MEMORY = new Map();
const MEMORY_CAP = 10_000;

function bucketKey(ip, name) {
  const safe = ip.replace(/[^a-zA-Z0-9.:_-]/g, "_").slice(0, 128);
  return `rl:ip:${safe}:${name}`;
}

function shouldBypass(request) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next/static") || path.startsWith("/_next/image")) return true;
  if (/\.(?:svg|png|jpe?g|gif|webp|ico|lottie|woff2?|css|js|map)$/i.test(path)) return true;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    if (path.startsWith("/api/cron/") && safeEqual(token, env.cron.secret)) return true;
  }

  if (path.startsWith("/api/webhooks/vision") && hasValidInternalSecret(request, env.webhook.secret)) {
    return true;
  }

  return false;
}

function memoryCount(key, windowStart, now) {
  let hits = MEMORY.get(key);
  if (!hits) {
    if (MEMORY.size >= MEMORY_CAP) MEMORY.delete(MEMORY.keys().next().value);
    hits = [];
    MEMORY.set(key, hits);
  }
  while (hits.length && hits[0] <= windowStart) hits.shift();
  hits.push(now);
  return hits.length;
}

async function redisCount(key, windowStart, now, windowSec) {
  const { ensureRedisConnection } = await import("@/lib/redis");
  const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
  const redis = await ensureRedisConnection();
  const results = await redis
    .multi()
    .zremrangebyscore(key, 0, windowStart)
    .zadd(key, now, member)
    .zcard(key)
    .expire(key, windowSec)
    .exec();
  const card = results?.[2];
  // @upstash/redis returns raw command results directly as elements in the response array
  // (e.g. results[2] is the number directly). ioredis returns them nested: [null, number].
  return (Array.isArray(card) ? Number(card[1]) : Number(card)) || 0;
}

async function countHit(store, key, windowStart, now, windowSec) {
  if (store === "memory") return memoryCount(key, windowStart, now);
  return redisCount(key, windowStart, now, windowSec);
}

async function checkBuckets(ip, includeUpload, store) {
  const { maxRequests, uploadMaxRequests, windowSeconds } = env.rateLimit;
  const limit = ip === "unknown" ? Math.max(1, Math.floor(maxRequests * UNKNOWN_IP_RATIO)) : maxRequests;
  const now = Date.now();
  const start = now - windowSeconds * 1000;

  const globalCount = await countHit(store, bucketKey(ip, "global"), start, now, windowSeconds);
  if (globalCount > limit) {
    return { allowed: false, limit, remaining: 0, retryAfterSeconds: windowSeconds };
  }

  if (!includeUpload) {
    return { allowed: true, limit, remaining: Math.max(0, limit - globalCount), retryAfterSeconds: windowSeconds };
  }

  const uploadLimit =
    ip === "unknown"
      ? Math.max(1, Math.floor(uploadMaxRequests * UNKNOWN_IP_RATIO))
      : uploadMaxRequests;
  const uploadCount = await countHit(store, bucketKey(ip, "upload"), start, now, windowSeconds);
  if (uploadCount > uploadLimit) {
    return { allowed: false, limit: uploadLimit, remaining: 0, retryAfterSeconds: windowSeconds };
  }

  return {
    allowed: true,
    limit: uploadLimit,
    remaining: Math.max(0, uploadLimit - uploadCount),
    retryAfterSeconds: windowSeconds,
  };
}

/** Resolve the rate-limit store for Node route handlers and proxy. */
export function getServerRateLimitStore() {
  return resolveIpRateLimitStore();
}

/** IP limits for upload API routes — Redis (REDIS_URL) or in-memory (dev). */
export async function checkIpRateLimits(ip, includeUpload = false) {
  const store = getServerRateLimitStore();
  if (store === "off") {
    return { allowed: true, limit: 0, remaining: 0, retryAfterSeconds: 0 };
  }
  return checkBuckets(ip, includeUpload, store);
}

/** Apply IP rate limits in the proxy layer. */
export async function applyProxyRateLimit(request) {
  const config = env.rateLimit;
  if (!config.enabled || shouldBypass(request)) return null;

  const store = getServerRateLimitStore();
  if (store === "off") return null;

  try {
    const result = await checkBuckets(
      getClientIpFromRequest(request),
      request.nextUrl.pathname.startsWith("/api/upload/"),
      store
    );
    if (result.allowed) return null;

    const headers = new Headers({ "Content-Type": "application/json" });
    headers.set("X-RateLimit-Limit", String(result.limit));
    headers.set("X-RateLimit-Remaining", "0");
    headers.set("Retry-After", String(result.retryAfterSeconds));
    return new NextResponse(JSON.stringify({ error: "rate_limit_exceeded" }), { status: 429, headers });
  } catch {
    return null;
  }
}
