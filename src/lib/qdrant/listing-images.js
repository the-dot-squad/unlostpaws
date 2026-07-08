import {
  COLLECTIONS,
  ensureCollections,
  getQdrantClient,
  normalizeVector,
  toPointId,
} from "@/lib/qdrant/client";

const COLLECTION = COLLECTIONS.listingImages;
const LISTING_ID_BATCH = 100;

function buildListingImageFilter({
  listingIds,
  petType,
  embeddingModel,
  listingStatus = "active",
  listingType,
  userId,
  excludeListingId,
  excludeUserId,
  center,
  radiusKm,
}) {
  const must = [
    { key: "listingStatus", match: { value: listingStatus } },
    { key: "embeddingModel", match: { value: embeddingModel } },
  ];

  if (petType) {
    must.push({ key: "petType", match: { value: petType } });
  }

  if (listingType) {
    must.push({ key: "listingType", match: { value: listingType } });
  }

  if (userId) {
    must.push({ key: "userId", match: { value: userId } });
  }

  if (excludeUserId) {
    must.push({
      key: "userId",
      match: { except: [excludeUserId] },
    });
  }

  if (listingIds?.length) {
    must.push({
      key: "listingId",
      match: { any: listingIds.map((id) => String(id)) },
    });
  }

  if (excludeListingId) {
    must.push({
      key: "listingId",
      match: { except: [String(excludeListingId)] },
    });
  }

  if (center && radiusKm) {
    must.push({
      key: "location",
      geo_radius: {
        center: {
          lat: Number(center.lat),
          lon: Number(center.lon),
        },
        radius: radiusKm * 1000,
      },
    });
  }

  return { must };
}

/**
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.listingImageId
 * @param {number[]} params.vector
 * @param {Object} params.payload
 */
export async function upsertListingImageVector({ listingImageId, vector, payload }) {
  if (!vector?.length) {
    throw new Error("Cannot upsert listing image vector: empty embedding");
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [
      {
        id: toPointId(listingImageId),
        vector,
        payload: {
          listingId: String(payload.listingId),
          listingStatus: payload.listingStatus,
          petType: payload.petType,
          listingType: payload.listingType,
          embeddingModel: payload.embeddingModel,
          userId: payload.userId,
          url: payload.url,
          location: payload.location,
        },
      },
    ],
  });
}

/**
 * @param {string|import('mongoose').Types.ObjectId} listingId
 * @param {string} status
 */
export async function updateListingImageStatus(listingId, status) {
  await ensureCollections();
  const qdrant = getQdrantClient();

  await qdrant.setPayload(COLLECTION, {
    wait: true,
    payload: { listingStatus: status },
    filter: {
      must: [{ key: "listingId", match: { value: String(listingId) } }],
    },
  });
}

/**
 * @param {string[]|import('mongoose').Types.ObjectId[]} listingIds
 * @param {string} status
 */
export async function updateListingImageStatusBulk(listingIds, status) {
  if (!listingIds?.length) return;
  await ensureCollections();
  const qdrant = getQdrantClient();

  await qdrant.setPayload(COLLECTION, {
    wait: true,
    payload: { listingStatus: status },
    filter: {
      must: [{ key: "listingId", match: { any: listingIds.map(String) } }],
    },
  });
}

/**
 * @param {string|import('mongoose').Types.ObjectId} listingId
 */
export async function deleteListingImageVectorsByListingId(listingId) {
  await ensureCollections();
  const qdrant = getQdrantClient();

  await qdrant.delete(COLLECTION, {
    wait: true,
    filter: {
      must: [{ key: "listingId", match: { value: String(listingId) } }],
    },
  });
}

/**
 * ANN search for listing images within a geo-filtered candidate set.
 */
export async function searchListingImages({
  vector,
  embeddingModel,
  petType,
  listingType,
  listingIds,
  center,
  radiusKm,
  excludeListingId,
  excludeUserId,
  limit = 50,
  scoreThreshold,
}) {
  if (!vector?.length) {
    return [];
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  if (listingIds?.length) {
    const ids = listingIds.map((id) => String(id));
    const results = [];

    for (let i = 0; i < ids.length; i += LISTING_ID_BATCH) {
      const batchIds = ids.slice(i, i + LISTING_ID_BATCH);
      const filter = buildListingImageFilter({
        listingIds: batchIds,
        petType,
        embeddingModel,
        listingType,
        excludeListingId,
        excludeUserId,
        center,
        radiusKm,
      });

      const batch = await qdrant.search(COLLECTION, {
        vector,
        filter,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      for (const hit of batch) {
        results.push({
          listingImageId: String(hit.id),
          listingId: hit.payload?.listingId,
          score: hit.score,
          url: hit.payload?.url || null,
        });
      }
    }

    return results;
  }

  const filter = buildListingImageFilter({
    petType,
    embeddingModel,
    listingType,
    excludeListingId,
    excludeUserId,
    center,
    radiusKm,
  });

  const hits = await qdrant.search(COLLECTION, {
    vector,
    filter,
    limit,
    score_threshold: scoreThreshold,
    with_payload: true,
  });

  return hits.map((hit) => ({
    listingImageId: String(hit.id),
    listingId: hit.payload?.listingId,
    score: hit.score,
    url: hit.payload?.url || null,
  }));
}

/** Search same user's prior listing images (abuse / repost detection). */
export async function searchListingImagesByUser({
  vector,
  userId,
  petType,
  embeddingModel,
  excludeListingId,
  limit = 10,
  scoreThreshold,
}) {
  if (!vector?.length || !userId) {
    return [];
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  const filter = buildListingImageFilter({
    userId,
    petType,
    embeddingModel,
    excludeListingId,
  });

  const hits = await qdrant.search(COLLECTION, {
    vector,
    filter,
    limit,
    score_threshold: scoreThreshold,
    with_payload: true,
  });

  return hits.map((hit) => ({
    listingImageId: String(hit.id),
    listingId: hit.payload?.listingId,
    score: hit.score,
    url: hit.payload?.url || null,
  }));
}

/** Search same listing-type images (spam duplicate detection). */
export async function searchSameTypeListingImages({
  vector,
  listingType,
  petType,
  embeddingModel,
  excludeListingId,
  excludeUserId,
  limit = 20,
  scoreThreshold,
}) {
  if (!vector?.length || !listingType) {
    return [];
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  const filter = buildListingImageFilter({
    listingType,
    petType,
    embeddingModel,
    excludeListingId,
  });

  const hits = await qdrant.search(COLLECTION, {
    vector,
    filter,
    limit: limit + (excludeUserId ? 5 : 0),
    score_threshold: scoreThreshold,
    with_payload: true,
  });

  return hits
    .filter((hit) => !excludeUserId || hit.payload?.userId !== excludeUserId)
    .slice(0, limit)
    .map((hit) => ({
      listingImageId: String(hit.id),
      listingId: hit.payload?.listingId,
      score: hit.score,
      url: hit.payload?.url || null,
    }));
}

/**
 * Retrieve all image vectors for a listing (cron re-scan).
 */
export async function getListingImageVectors(listingId) {
  await ensureCollections();
  const qdrant = getQdrantClient();

  const { points } = await qdrant.scroll(COLLECTION, {
    filter: {
      must: [{ key: "listingId", match: { value: String(listingId) } }],
    },
    limit: 20,
    with_vector: true,
    with_payload: true,
  });

  return (points || [])
    .map((point) => {
      const embedding = normalizeVector(point.vector);
      if (!embedding?.length) return null;
      return { url: point.payload?.url || "", embedding };
    })
    .filter(Boolean);
}
