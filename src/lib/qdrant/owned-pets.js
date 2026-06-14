import {
  COLLECTIONS,
  ensureCollections,
  fromPointId,
  getQdrantClient,
  isQdrantNotFoundError,
  toPointId,
} from "@/lib/qdrant/client";

const COLLECTION = COLLECTIONS.ownedPets;

/**
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.ownedPetId
 * @param {number[]} params.vector
 * @param {Object} params.payload
 */
export async function upsertOwnedPetVector({ ownedPetId, vector, payload }) {
  if (!vector?.length) {
    throw new Error("Cannot upsert owned pet vector: empty embedding");
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: [
      {
        id: toPointId(ownedPetId),
        vector,
        payload: {
          userId: payload.userId,
          status: payload.status,
          petType: payload.petType,
          embeddingModel: payload.embeddingModel,
          name: payload.name,
        },
      },
    ],
  });
}

/**
 * @param {string|import('mongoose').Types.ObjectId} ownedPetId
 */
export async function deleteOwnedPetVector(ownedPetId) {
  await ensureCollections();
  const qdrant = getQdrantClient();

  try {
    await qdrant.delete(COLLECTION, {
      wait: true,
      points: [toPointId(ownedPetId)],
    });
  } catch (err) {
    if (!isQdrantNotFoundError(err)) {
      throw err;
    }
  }
}

/**
 * @param {string|import('mongoose').Types.ObjectId} ownedPetId
 * @param {string} status
 */
export async function updateOwnedPetStatus(ownedPetId, status) {
  await ensureCollections();
  const qdrant = getQdrantClient();

  try {
    await qdrant.setPayload(COLLECTION, {
      wait: true,
      payload: { status },
      points: [toPointId(ownedPetId)],
    });
  } catch (err) {
    if (!isQdrantNotFoundError(err)) {
      throw err;
    }
  }
}

/**
 * @param {Object} params
 * @param {number[]} params.vector
 * @param {string} params.userId
 * @param {string} params.petType
 * @param {string} params.embeddingModel
 * @param {number} [params.limit]
 * @param {number} [params.scoreThreshold]
 * @returns {Promise<Array<{ ownedPetId: string, score: number, name: string }>>}
 */
export async function searchOwnedPets({
  vector,
  userId,
  petType,
  embeddingModel,
  limit = 10,
  scoreThreshold,
}) {
  if (!vector?.length) {
    return [];
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  const hits = await qdrant.search(COLLECTION, {
    vector,
    filter: {
      must: [
        { key: "userId", match: { value: userId } },
        { key: "status", match: { value: "active" } },
        { key: "petType", match: { value: petType } },
        { key: "embeddingModel", match: { value: embeddingModel } },
      ],
    },
    limit,
    score_threshold: scoreThreshold,
    with_payload: true,
  });

  return hits.map((hit) => ({
    ownedPetId: fromPointId(hit.id),
    score: hit.score,
    name: hit.payload?.name || "",
    userId: hit.payload?.userId || "",
  }));
}

/**
 * Global owned-pet search (found/sighting/surrender → registered pets).
 */
export async function searchOwnedPetsGlobal({
  vector,
  petType,
  embeddingModel,
  limit = 20,
  scoreThreshold,
}) {
  if (!vector?.length) {
    return [];
  }

  await ensureCollections();
  const qdrant = getQdrantClient();

  const hits = await qdrant.search(COLLECTION, {
    vector,
    filter: {
      must: [
        { key: "status", match: { value: "active" } },
        { key: "petType", match: { value: petType } },
        { key: "embeddingModel", match: { value: embeddingModel } },
      ],
    },
    limit,
    score_threshold: scoreThreshold,
    with_payload: true,
  });

  return hits.map((hit) => ({
    ownedPetId: fromPointId(hit.id),
    score: hit.score,
    name: hit.payload?.name || "",
    userId: hit.payload?.userId || "",
  }));
}
