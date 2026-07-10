import { connectDB, getMongoDb } from "@/config/db";
import { env } from "@/config/env";
import { hasRedis, withRedisClient, xinfoGroups } from "@/lib/redis";
import { COLLECTIONS, getQdrantClient } from "@/lib/qdrant/client";
import { Listing } from "@/models/listing";
import { OwnedPet } from "@/models/owned-pet";
import { ListingImage } from "@/models/listing-image";
import { PROCESSING_STATUSES } from "@/config/constants/enums";
import {
  IMAGE_QUEUE_CONSUMER_GROUP,
  IMAGE_QUEUE_DLQ_STREAM,
  IMAGE_QUEUE_STREAM,
  TRACKED_COLLECTIONS,
} from "@/config/constants/platform";
import {
  buildServicesHealth,
  collectionStats,
  coveragePct,
  getEnvironmentSnapshot,
  parseXinfoGroupEntry,
  pingMongo,
  processingStatusMap,
  REDIS_UNAVAILABLE,
} from "./helpers";

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

async function getRedisStats() {
  if (!hasRedis()) return REDIS_UNAVAILABLE;

  try {
    const data = await withRedisClient(async (redis) => {
      const [queueLength, dlqLength, groups] = await Promise.all([
        redis.xlen(IMAGE_QUEUE_STREAM),
        redis.xlen(IMAGE_QUEUE_DLQ_STREAM),
        xinfoGroups(IMAGE_QUEUE_STREAM).catch(() => []),
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
    listings: processingStatusMap(listingRows, PROCESSING_STATUSES),
    ownedPets: processingStatusMap(petRows, PROCESSING_STATUSES),
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

/** Infrastructure payload for /admin/stats. */
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
