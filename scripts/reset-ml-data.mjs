/**
 * Reset ML-derived data (ListingImage, ListingMatch) and Qdrant vectors.
 * Usage: node --env-file=.env.local scripts/reset-ml-data.mjs
 */

import mongoose from "mongoose";
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../src/config/env.js";

const DATABASE_URL = env.db.url;
const QDRANT_URL = env.qdrant.url;
const QDRANT_API_KEY = env.qdrant.apiKey || undefined;
const VECTOR_SIZE = env.qdrant.vectorSize;
const SCALAR_QUANTIZATION = env.qdrant.scalarQuantization;

const COLLECTIONS = ["listing_images", "owned_pets"];

const LISTING_IMAGE_INDEXES = [
  "listingId",
  "listingStatus",
  "petType",
  "listingType",
  "embeddingModel",
  "userId",
];

const OWNED_PET_INDEXES = ["userId", "status", "petType", "embeddingModel"];

async function resetQdrant() {
  if (!QDRANT_URL) {
    throw new Error("QDRANT_URL is required");
  }

  const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

  for (const name of COLLECTIONS) {
    try {
      await client.deleteCollection(name);
      console.log("Deleted Qdrant collection:", name);
    } catch {
      console.log("Qdrant collection not found (skipped):", name);
    }

    const vectors = { size: VECTOR_SIZE, distance: "Cosine" };
    const createParams = { vectors };

    if (SCALAR_QUANTIZATION) {
      createParams.quantization_config = {
        scalar: { type: "int8", quantile: 0.99, always_ram: true },
      };
    }

    await client.createCollection(name, createParams);
    console.log("Created Qdrant collection:", name);
  }

  for (const field of LISTING_IMAGE_INDEXES) {
    await client.createPayloadIndex("listing_images", {
      field_name: field,
      field_schema: "keyword",
    });
  }

  for (const field of OWNED_PET_INDEXES) {
    await client.createPayloadIndex("owned_pets", {
      field_name: field,
      field_schema: "keyword",
    });
  }

  console.log("Qdrant payload indexes ready");
}

async function main() {
  await mongoose.connect(DATABASE_URL);

  const db = mongoose.connection.db;
  const listingImages = await db.collection("listingimages").deleteMany({});
  const listingMatches = await db.collection("listingmatches").deleteMany({});
  const listings = await db.collection("listings").updateMany(
    {},
    {
      $set: {
        processingStatus: "pending",
        processingError: "",
        embeddingModel: "",
        lastMatchScanAt: null,
      },
    }
  );

  const ownedPets = await db.collection("ownedpets").updateMany(
    {},
    {
      $set: {
        hasEmbedding: false,
        embeddingModel: "",
        processingStatus: "pending",
        processingError: "",
      },
    }
  );

  console.log("Deleted ListingImage:", listingImages.deletedCount);
  console.log("Deleted ListingMatch:", listingMatches.deletedCount);
  console.log("Reset listings:", listings.modifiedCount);
  console.log("Reset owned pets:", ownedPets.modifiedCount);

  await resetQdrant();

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
