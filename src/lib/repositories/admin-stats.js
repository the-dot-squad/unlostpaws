/**
 * Admin statistics — operational dashboard metrics and infrastructure telemetry.
 *
 * Exports:
 *   getDashboardStats()       — /admin home (moderation, growth, recent activity)
 *   getInfrastructureStats()  — /admin/stats (DB, vectors, Redis queue, ML pipeline)
 *
 * List queries: @/lib/repositories/admin.
 */

import { connectDB, getMongoDb } from "@/config/db";
import { attachListingPublicId } from "@/models/listing";
import { env } from "@/config/env";
import { hasRedis, withRedisClient } from "@/lib/redis";
import { hasS3Backend, isS3Storage } from "@/lib/storage/s3";
import { COLLECTIONS, getQdrantClient } from "@/lib/qdrant/client";
import { Listing } from "@/models/listing";
import { ModerationReport } from "@/models/moderation-report";
import { PROCESSING_STATUSES } from "@/config/constants/enums";
import { IMAGE_QUEUE_CONSUMER_GROUP, IMAGE_QUEUE_DLQ_STREAM, IMAGE_QUEUE_STREAM } from "@/config/constants/platform";
import { TRACKED_COLLECTIONS } from "@/config/constants/platform";
import {
  countOpenReportCases,
  getOpenReportStatsByListingIds,
  getRecentOpenReportCases,
} from "@/lib/moderation/report-cases";
import { ListingMatch } from "@/models/listing-match";
import { OwnedPet } from "@/models/owned-pet";
import { ListingImage } from "@/models/listing-image";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const RECENT_LISTING_LIMIT = 6;
const RECENT_REPORT_LIMIT = 5;

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

/** collStats for one MongoDB collection — zeros when the collection is missing. */
async function collectionStats(db, name) {
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

/** Parse a flat XINFO GROUPS entry — ioredis returns [key, value, key, value, ...]. */
function parseXinfoGroupEntry(entry) {
  const parsed = {};
  for (let i = 0; i < entry.length; i += 2) {
    parsed[entry[i]] = entry[i + 1];
  }
  return parsed;
}

/** Normalize aggregate rows into a fixed-key map keyed by processingStatus. */
function processingStatusMap(rows) {
  return Object.fromEntries(
    PROCESSING_STATUSES.map((status) => [status, rows.find((r) => r._id === status)?.count ?? 0])
  );
}

function coveragePct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Qdrant
// ---------------------------------------------------------------------------

async function getQdrantStats() {
  if (!env.qdrant.url) {
    return { configured: false, collections: [], totalPoints: 0, totalVectors: 0 };
  }

  try {
    const qdrant = getQdrantClient();
    const collections = [];

    for (const name of Object.values(COLLECTIONS)) {
      try {
        const info = await qdrant.getCollection(name);
        const points = info.points_count ?? 0;
        const vectors =
          info.vectors_count ??
          Object.values(info.vectors || {}).reduce((sum, v) => sum + (v?.vectors_count ?? 0), 0) ??
          points;

        collections.push({
          name,
          points,
          vectors,
          status: info.status,
          vectorSize: info.config?.params?.vectors?.size ?? env.qdrant.vectorSize,
          distance: info.config?.params?.vectors?.distance ?? "Cosine",
          segments: info.segments_count ?? 0,
        });
      } catch {
        collections.push({
          name,
          points: 0,
          vectors: 0,
          status: "missing",
          vectorSize: env.qdrant.vectorSize,
          distance: "Cosine",
          segments: 0,
        });
      }
    }

    return {
      configured: true,
      collections,
      totalPoints: collections.reduce((sum, c) => sum + c.points, 0),
      totalVectors: collections.reduce((sum, c) => sum + c.vectors, 0),
    };
  } catch {
    return { configured: true, error: true, collections: [], totalPoints: 0, totalVectors: 0 };
  }
}

// ---------------------------------------------------------------------------
// Redis ML queue
// ---------------------------------------------------------------------------

const REDIS_UNAVAILABLE = {
  configured: false,
  connected: false,
  queue: null,
  dlq: null,
  consumerGroup: null,
};

async function getRedisStats() {
  if (!hasRedis()) return REDIS_UNAVAILABLE;

  try {
    const data = await withRedisClient(async (redis) => {
      const [queueLength, dlqLength, groups] = await Promise.all([
        redis.xlen(IMAGE_QUEUE_STREAM),
        redis.xlen(IMAGE_QUEUE_DLQ_STREAM),
        redis.xinfo("GROUPS", IMAGE_QUEUE_STREAM).catch(() => []),
      ]);
      return { queueLength, dlqLength, groups };
    });

    const rawGroup = data.groups.find(
      (g) => parseXinfoGroupEntry(g).name === IMAGE_QUEUE_CONSUMER_GROUP
    );
    const groupFields = rawGroup ? parseXinfoGroupEntry(rawGroup) : null;

    const consumerGroup = groupFields
      ? {
          name: IMAGE_QUEUE_CONSUMER_GROUP,
          exists: true,
          consumers: Number(groupFields.consumers ?? 0),
          pending: Number(groupFields.pending ?? 0),
          lastDeliveredId: groupFields["last-delivered-id"] ?? null,
        }
      : { name: IMAGE_QUEUE_CONSUMER_GROUP, exists: false, consumers: 0, pending: 0 };

    return {
      configured: true,
      connected: true,
      queue: { stream: IMAGE_QUEUE_STREAM, length: data.queueLength },
      dlq: { stream: IMAGE_QUEUE_DLQ_STREAM, length: data.dlqLength },
      consumerGroup,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err.message,
      queue: null,
      dlq: null,
      consumerGroup: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Infrastructure sections
// ---------------------------------------------------------------------------

async function getProcessingPipelineStats() {
  const [listingRows, petRows, failedListings, failedPets] = await Promise.all([
    Listing.aggregate([
      { $group: { _id: "$processingStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    OwnedPet.aggregate([
      { $group: { _id: "$processingStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.countDocuments({ processingStatus: "failed" }),
    OwnedPet.countDocuments({ processingStatus: "failed" }),
  ]);

  return {
    listings: processingStatusMap(listingRows),
    ownedPets: processingStatusMap(petRows),
    failedTotal: failedListings + failedPets,
  };
}

async function getEmbeddingStats() {
  const [totalImages, embeddedImages, totalPets, embeddedPets] = await Promise.all([
    ListingImage.countDocuments(),
    ListingImage.countDocuments({ hasEmbedding: true }),
    OwnedPet.countDocuments({ status: "active" }),
    OwnedPet.countDocuments({ status: "active", hasEmbedding: true }),
  ]);

  return {
    listingImages: {
      total: totalImages,
      embedded: embeddedImages,
      coveragePct: coveragePct(embeddedImages, totalImages),
    },
    ownedPets: {
      total: totalPets,
      embedded: embeddedPets,
      coveragePct: coveragePct(embeddedPets, totalPets),
    },
  };
}

async function pingMongo() {
  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });
    return { ok: true, label: db.databaseName };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Derive service health cards from already-fetched probe results — no extra round-trips. */
function buildServicesHealth({ mongo, redis, qdrant }) {
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

function getEnvironmentSnapshot(db) {
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

/**
 * Infrastructure payload for /admin/stats.
 */
export async function getInfrastructureStats() {
  await connectDB();
  const db = await getMongoDb();

  const [collectionSizes, qdrant, redis, processing, embeddings, mongo] = await Promise.all([
    Promise.all(TRACKED_COLLECTIONS.map((name) => collectionStats(db, name))),
    getQdrantStats(),
    getRedisStats(),
    getProcessingPipelineStats(),
    getEmbeddingStats(),
    pingMongo(),
  ]);

  const totalStorage = collectionSizes.reduce((sum, c) => sum + c.storageSize, 0);
  const totalDataSize = collectionSizes.reduce((sum, c) => sum + c.size, 0);
  const totalDocuments = collectionSizes.reduce((sum, c) => sum + c.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    services: buildServicesHealth({ mongo, redis, qdrant }),
    environment: getEnvironmentSnapshot(db),
    database: {
      collections: collectionSizes.sort((a, b) => b.storageSize - a.storageSize),
      totalStorage,
      totalDataSize,
      totalDocuments,
      totalIndexes: collectionSizes.reduce((sum, c) => sum + c.indexes, 0),
    },
    qdrant,
    redis,
    processing,
    embeddings,
  };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * Operational payload for /admin home.
 */
export async function getDashboardStats() {
  await connectDB();
  const db = await getMongoDb();
  const today = startOfTodayUtc();
  const weekAgo = sevenDaysAgo();

  const [
    totalUsers,
    totalListings,
    activeListings,
    underReviewListings,
    resolvedListings,
    listingsToday,
    listingsThisWeek,
    openReports,
    totalReports,
    matchesSent,
    pendingMatches,
    confirmedMatches,
    registeredPets,
    failedProcessingListings,
    failedProcessingPets,
    listingsByType,
    listingsByStatus,
    reportsByReason,
    recentListings,
    recentReports,
  ] = await Promise.all([
    db.collection("user").countDocuments(),
    Listing.countDocuments(),
    Listing.countDocuments({ status: "active" }),
    Listing.countDocuments({ status: "under_review" }),
    Listing.countDocuments({ status: "resolved" }),
    Listing.countDocuments({ createdAt: { $gte: today } }),
    Listing.countDocuments({ createdAt: { $gte: weekAgo } }),
    countOpenReportCases(),
    ModerationReport.countDocuments(),
    ListingMatch.countDocuments({ status: "notified" }),
    ListingMatch.countDocuments({ status: "pending" }),
    ListingMatch.countDocuments({ status: "confirmed" }),
    OwnedPet.countDocuments({ status: "active" }),
    Listing.countDocuments({ processingStatus: "failed" }),
    OwnedPet.countDocuments({ processingStatus: "failed" }),
    Listing.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ModerationReport.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.find()
      .sort({ createdAt: -1 })
      .limit(RECENT_LISTING_LIMIT)
      .select("petType color type status reportCount createdAt")
      .lean(),
    getRecentOpenReportCases(RECENT_REPORT_LIMIT),
  ]);

  const recentListingOpenStats = await getOpenReportStatsByListingIds(
    recentListings.map((l) => l._id)
  );
  const recentListingsWithReports = recentListings.map((l) =>
    attachListingPublicId({
      ...l,
      ...(recentListingOpenStats[String(l._id)] ?? { openReportCount: 0, openCaseCount: 0 }),
    })
  );

  const failedProcessing = failedProcessingListings + failedProcessingPets;

  const attention = [
    openReports > 0 && { key: "reports", label: "Open report cases", count: openReports, href: "/admin/reports" },
    underReviewListings > 0 && {
      key: "review",
      label: "Listings under review",
      count: underReviewListings,
      href: "/admin/listings?status=under_review",
    },
    pendingMatches > 0 && {
      key: "matches",
      label: "Pending AI matches",
      count: pendingMatches,
      href: "/admin/matches",
    },
    failedProcessing > 0 && {
      key: "ml-failed",
      label: "Failed ML processing",
      count: failedProcessing,
      href: "/admin/stats#processing",
    },
  ].filter(Boolean);

  return {
    attention,
    users: { total: totalUsers },
    listings: {
      total: totalListings,
      active: activeListings,
      underReview: underReviewListings,
      resolved: resolvedListings,
      today: listingsToday,
      thisWeek: listingsThisWeek,
      byType: listingsByType,
      byStatus: listingsByStatus,
      recent: recentListingsWithReports,
    },
    reports: {
      open: openReports,
      total: totalReports,
      byReason: reportsByReason,
      recent: recentReports,
    },
    matches: { sent: matchesSent, pending: pendingMatches, confirmed: confirmedMatches },
    pets: { active: registeredPets },
    processing: { failed: failedProcessing },
  };
}
