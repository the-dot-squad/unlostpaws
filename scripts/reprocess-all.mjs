/**
 * Re-enqueue all active listings for ML processing.
 * Usage: node --env-file=.env.local scripts/reprocess-all.mjs
 */

import mongoose from "mongoose";
import { Redis } from "@upstash/redis";
import { env } from "../src/config/env.js";

const IMAGE_QUEUE_STREAM = "unlostpaws:stream:vision-processing";

const DATABASE_URL = env.db.url;
const REST_URL = env.redis.url;
const REST_TOKEN = env.redis.token;

if (!REST_URL || !REST_TOKEN) {
  console.error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in .env.local");
  process.exit(1);
}

async function main() {
  await mongoose.connect(DATABASE_URL);
  
  const redis = new Redis({
    url: REST_URL,
    token: REST_TOKEN,
  });

  try {
    await redis.ping();
  } catch (err) {
    console.error(`Redis connection failed: ${err.message}`);
    process.exit(1);
  }

  const listings = await mongoose.connection.db
    .collection("listings")
    .find({ status: "active" })
    .toArray();

  let enqueued = 0;

  for (const listing of listings) {
    const imageUrls = (listing.images || []).map((img) => img.url).filter(Boolean);
    if (imageUrls.length < 2) {
      continue;
    }

    await redis.xadd(
      IMAGE_QUEUE_STREAM,
      "*",
      {
        payload: JSON.stringify({
          listingId: listing._id.toString(),
          imageUrls,
          listingType: listing.type,
          petType: listing.petType,
          jobType: "listing",
          attempt: 0,
        })
      }
    );

    await mongoose.connection.db.collection("listings").updateOne(
      { _id: listing._id },
      { $set: { processingStatus: "pending", processingError: "" } }
    );

    enqueued++;
  }

  console.log(`Enqueued ${enqueued} listings`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
