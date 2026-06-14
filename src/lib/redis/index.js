/** @file Shared Redis connection for server-side job enqueueing and health probes. */

import IORedis from "ioredis";
import { env } from "@/config/env";
import { redisConnectionOptions } from "@/lib/redis/resolve-url";

/** @returns {boolean} Whether a Redis URL is configured. */
export function hasRedis() {
  return Boolean(env.redis.url);
}

/** Stop reconnecting after a few attempts — prevents log spam when Redis is down. */
function retryStrategy(times) {
  if (times > 5) return null;
  return Math.min(times * 200, 2000);
}

let sharedConnection = null;
/** @type {Promise<import("ioredis").default> | null} */
let connectPromise = null;

/**
 * Lazy singleton Redis client for enqueueing ML jobs.
 * @returns {import("ioredis").default}
 */
export function getRedisConnection() {
  if (!env.redis.url) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!sharedConnection) {
    sharedConnection = new IORedis(env.redis.url, {
      ...redisConnectionOptions(env.redis.url),
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy,
    });

    sharedConnection.on("error", () => {});
  }

  return sharedConnection;
}

/**
 * Connect the shared client before issuing commands.
 * @returns {Promise<import("ioredis").default>}
 */
export async function ensureRedisConnection() {
  const redis = getRedisConnection();
  if (redis.status === "ready") return redis;

  if (redis.status === "end") {
    connectPromise = null;
  }

  if (!connectPromise) {
    connectPromise = redis.connect().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }

  await connectPromise;
  return redis;
}

/**
 * Run commands on a short-lived Redis connection (admin probes, health checks).
 *
 * @template T
 * @param {(client: import("ioredis").default) => Promise<T>} fn
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<T>}
 */
export async function withRedisClient(fn, { timeoutMs = 3000 } = {}) {
  if (!env.redis.url) {
    throw new Error("REDIS_URL is not configured");
  }

  const client = new IORedis(env.redis.url, {
    ...redisConnectionOptions(env.redis.url),
    connectTimeout: timeoutMs,
    commandTimeout: timeoutMs,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
    enableOfflineQueue: false,
    autoResubscribe: false,
    autoResendUnfulfilledCommands: false,
  });

  client.on("error", () => {});

  try {
    await client.connect();
    return await fn(client);
  } finally {
    client.disconnect();
  }
}
