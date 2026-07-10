import { env } from "@/config/env";
import { hasRedis } from "@/lib/redis";
import { hasS3Backend, isS3Storage } from "@/lib/storage/s3";
import { getMongoDb } from "@/config/db";

export const RECENT_LISTING_LIMIT = 6;
export const RECENT_REPORT_LIMIT = 5;

export function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

/** collStats for one MongoDB collection — zeros when the collection is missing. */
export async function collectionStats(db, name) {
  try {
    const stats = await db.command({ collStats: name, scale: 1 });
    return {
      name,
      count: stats.count ?? 0,
      size: stats.size ?? 0,
      storageSize: stats.storageSize ?? 0,
      avgObjSize: stats.avgObjSize ?? 0,
      indexes: stats.nindexes ?? 0,
    };
  } catch {
    return { name, count: 0, size: 0, storageSize: 0, avgObjSize: 0, indexes: 0 };
  }
}

/** Parse a flat XINFO GROUPS entry — Upstash returns [key, value, key, value, ...]. */
export function parseXinfoGroupEntry(entry) {
  const parsed = {};
  for (let i = 0; i < entry.length; i += 2) {
    parsed[entry[i]] = entry[i + 1];
  }
  return parsed;
}

/** Normalize aggregate rows into a fixed-key map keyed by processingStatus. */
export function processingStatusMap(rows, statuses) {
  return Object.fromEntries(
    statuses.map((status) => [status, rows.find((r) => r._id === status)?.count ?? 0])
  );
}

export function coveragePct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export async function pingMongo() {
  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });
    return { ok: true, label: db.databaseName };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Derive service health cards from already-fetched probe results — no extra round-trips. */
export function buildServicesHealth({ mongo, redis, qdrant }) {
  return {
    mongo,
    redis: redis.configured
      ? { ok: redis.connected, configured: true, error: redis.error }
      : { ok: null, configured: false },
    qdrant: qdrant.configured
      ? { ok: !qdrant.error, configured: true, error: qdrant.error ? "Unreachable" : undefined }
      : { ok: null, configured: false },
  };
}

export function getEnvironmentSnapshot(db) {
  return {
    nodeEnv: env.nodeEnv,
    appUrl: env.app.url,
    dbName: db.databaseName,
    storage: {
      mode: env.storage.mode,
      bucket: env.storage.bucket ?? null,
      hasBackend: hasS3Backend(),
      publicViaS3: isS3Storage(),
    },
    redis: { configured: hasRedis() },
    qdrant: {
      configured: Boolean(env.qdrant.url),
      vectorSize: env.qdrant.vectorSize,
    },
    email: { provider: env.email.provider },
    turnstile: { configured: Boolean(env.turnstile.siteKey && env.turnstile.secretKey) },
    auth: {
      google: Boolean(env.auth.google.clientId),
      facebook: Boolean(env.auth.facebook.clientId),
      twitter: Boolean(env.auth.twitter.clientId),
    },
  };
}

export const REDIS_UNAVAILABLE = {
  configured: false,
  connected: false,
  queue: null,
  dlq: null,
  consumerGroup: null,
};
