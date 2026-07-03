/** @file Shared Redis connection for server-side job enqueueing and health probes. */

import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

/** @returns {boolean} Whether Upstash Redis is configured. */
export function hasRedis() {
  return Boolean(env.redis.url && env.redis.token);
}

let sharedConnection = null;

/**
 * Lazy singleton Upstash Redis client.
 * Returns a client wrapped with ioredis compatibility layer.
 * @returns {Redis & { status: string, connect: Function, disconnect: Function, quit: Function }}
 */
export function getRedisConnection() {
  if (!env.redis.url || !env.redis.token) {
    throw new Error("Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
  }

  if (!sharedConnection) {
    const client = new Redis({
      url: env.redis.url,
      token: env.redis.token,
    });

    // Decorate client with a compatibility layer for ioredis
    client.status = "ready";
    client.connect = async () => client;
    client.disconnect = () => {};
    client.quit = async () => {};

    sharedConnection = client;
  }

  return sharedConnection;
}

/**
 * Connect the shared client before issuing commands (compatibility wrapper).
 * @returns {Promise<Redis>}
 */
export async function ensureRedisConnection() {
  return getRedisConnection();
}

/**
 * Run commands on a short-lived Redis connection (compatibility wrapper).
 * Since Upstash Redis uses HTTP and is stateless, this uses the singleton client directly.
 *
 * @template T
 * @param {(client: Redis) => Promise<T>} fn
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<T>}
 */
export async function withRedisClient(fn, { timeoutMs = 3000 } = {}) {
  const client = getRedisConnection();
  return await fn(client);
}
