/**
 * Re-enqueue all active listings for ML processing.
 * Usage: node --env-file=.env.local scripts/reprocess-all.mjs
 */

import mongoose from "mongoose";
import IORedis from "ioredis";
import { env } from "../src/config/env.js";
import { redisConnectionOptions } from "../src/lib/redis/resolve-url.js";

const IMAGE_QUEUE_STREAM = "unlostpaws:stream:vision-processing";

const DATABASE_URL = env.db.url;
const REDIS_URL = env.redis.url;

if (!REDIS_URL) {
  console.error("REDIS_URL is required in .env.local");
  process.exit(1);
}

/**
 * @param {string} url
 * @returns {Promise<import("ioredis").default>}
 */
async function connectRedis(url) {
  const redis = new IORedis(url, {
    ...redisConnectionOptions(url),
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
  });

  redis.on("error", () => {});

  try {
    await redis.ping();
    return redis;
  } catch (err) {
    redis.disconnect();
    const message = err?.message || String(err);

    if (message.includes("NOAUTH")) {
      console.error(
        "Redis authentication failed. Your Redis server requires a password.\n" +
          "Set credentials in REDIS_URL (e.g. redis://:password@localhost:6379) " +
          "or add REDIS_PASSWORD to .env.local."
      );
    } else {
      console.error(`Redis connection failed: ${message}`);
    }

    process.exit(1);
  }
}

async function main() {
  await mongoose.connect(DATABASE_URL);
  const redis = await connectRedis(REDIS_URL);

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
      "payload",
      JSON.stringify({
        listingId: listing._id.toString(),
        imageUrls,
        listingType: listing.type,
        petType: listing.petType,
        jobType: "listing",
        attempt: 0,
      })
    );

    await mongoose.connection.db.collection("listings").updateOne(
      { _id: listing._id },
      { $set: { processingStatus: "pending", processingError: "" } }
    );

    enqueued++;
  }

  console.log(`Enqueued ${enqueued} listings`);
  await redis.quit();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
