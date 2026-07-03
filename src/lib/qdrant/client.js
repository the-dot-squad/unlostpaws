import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/config/env";

export const COLLECTIONS = {
  listingImages: "listing_images",
  ownedPets: "owned_pets",
};

const LISTING_IMAGE_INDEXES = [
  "listingId",
  "listingStatus",
  "petType",
  "listingType",
  "embeddingModel",
  "userId",
];

const OWNED_PET_INDEXES = ["userId", "status", "petType", "embeddingModel"];

let client = null;
let collectionsReady = false;

export function getQdrantClient() {
  if (!env.qdrant.url) {
    throw new Error("QDRANT_URL is not configured");
  }

  if (!client) {
    client = new QdrantClient({
      url: env.qdrant.url,
      apiKey: env.qdrant.apiKey || undefined,
    });
  }

  return client;
}

const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;
const UUID_HEX = /^[0-9a-f]{32}$/i;

function formatUuid(hex32) {
  return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-${hex32.slice(12, 16)}-${hex32.slice(16, 20)}-${hex32.slice(20, 32)}`;
}

/**
 * Convert MongoDB ObjectId to a Qdrant point id (UUID).
 * Qdrant only accepts unsigned integers or UUIDs — not 24-char ObjectId hex.
 */
export function toPointId(id) {
  const raw = String(id).trim();

  if (OBJECT_ID_HEX.test(raw)) {
    return formatUuid(raw.padEnd(32, "0"));
  }

  if (UUID_HEX.test(raw.replace(/-/g, ""))) {
    return raw.includes("-") ? raw : formatUuid(raw);
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  throw new Error(`Invalid Qdrant point id: ${id}`);
}

/** Reverse {@link toPointId} for MongoDB lookups (owned pets, etc.). */
export function fromPointId(pointId) {
  const raw = String(pointId).trim();

  if (OBJECT_ID_HEX.test(raw)) {
    return raw;
  }

  const hex = raw.replace(/-/g, "");
  if (UUID_HEX.test(hex)) {
    const objectIdHex = hex.slice(0, 24);
    if (OBJECT_ID_HEX.test(objectIdHex)) {
      return objectIdHex;
    }
  }

  return raw;
}

/** Keyword payload value for MongoDB ids stored in Qdrant filters. */
export function toPayloadId(id) {
  return String(id);
}

/** True when Qdrant has no matching point/collection (safe to ignore on delete/status sync). */
export function isQdrantNotFoundError(err) {
  if (err?.status === 404) {
    return true;
  }

  const message = err?.data?.status?.error ?? err?.message ?? String(err);
  return /not found/i.test(message);
}

/** Normalize a vector returned by Qdrant retrieve/search APIs. */
export function normalizeVector(raw) {
  if (!raw) {
    return null;
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  const values = Object.values(raw);
  return values.length ? values : null;
}

async function ensureCollection(name) {
  const qdrant = getQdrantClient();
  const { collections } = await qdrant.getCollections();
  const exists = collections.some((c) => c.name === name);

  if (!exists) {
    const vectors = {
      size: env.qdrant.vectorSize,
      distance: "Cosine",
    };

    const createParams = { vectors };

    if (env.qdrant.scalarQuantization) {
      createParams.quantization_config = {
        scalar: {
          type: "int8",
          quantile: 0.99,
          always_ram: true,
        },
      };
    }

    await qdrant.createCollection(name, createParams);
  }
}

async function ensurePayloadIndex(collection, fieldName) {
  const qdrant = getQdrantClient();

  try {
    await qdrant.createPayloadIndex(collection, {
      field_name: fieldName,
      field_schema: "keyword",
    });
  } catch (err) {
    const message = err?.message || String(err);
    if (!message.includes("already exists")) {
      throw err;
    }
  }
}

/** Create collections and payload indexes if missing (idempotent). */
export async function ensureCollections() {
  if (collectionsReady) {
    return;
  }

  // Check and create both collections in parallel
  await Promise.all([
    ensureCollection(COLLECTIONS.listingImages),
    ensureCollection(COLLECTIONS.ownedPets),
  ]);

  // Create all payload indexes concurrently
  const indexPromises = [
    ...LISTING_IMAGE_INDEXES.map((field) => ensurePayloadIndex(COLLECTIONS.listingImages, field)),
    ...OWNED_PET_INDEXES.map((field) => ensurePayloadIndex(COLLECTIONS.ownedPets, field)),
  ];

  await Promise.all(indexPromises);

  collectionsReady = true;
}

/** Drop and recreate ML vector collections (used by reset script). */
export async function truncateMlCollections() {
  const qdrant = getQdrantClient();

  for (const name of Object.values(COLLECTIONS)) {
    try {
      await qdrant.deleteCollection(name);
    } catch {
      // collection may not exist yet
    }
  }

  collectionsReady = false;
  await ensureCollections();
}
