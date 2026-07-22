/** @file Vision job queue — enqueue new jobs and admin requeue after failure. */

import { connectDB } from "@/config/db";
import { ensureRedisConnection, hasRedis } from "@/lib/redis";
import { IMAGE_QUEUE_STREAM, MAX_JOB_ATTEMPTS, ML_JOB_TYPES } from "@/config/constants/platform";
import { env } from "@/config/env";
import { MIN_LISTING_IMAGES, PET_TYPES } from "@/config/constants/enums";
import { markProcessingFailed, processingErrorKey } from "@/lib/intelligence/processing";

/**
 * @typedef {Object} ImageJobPayload
 * @property {string} [listingId]
 * @property {string[]} imageUrls
 * @property {string} [listingType]
 * @property {string} [petType]
 * @property {'listing'|'owned-pet'} [jobType]
 * @property {string} [ownedPetId]
 * @property {number} [attempt]
 */

/**
 * Push an image-processing job to the Redis vision stream.
 *
 * @param {ImageJobPayload} payload
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function enqueueImageJob(payload) {
  if (!hasRedis()) {
    console.error("Upstash Redis is required to enqueue image processing jobs (UPSTASH_REDIS_REST_URL/TOKEN)");
    return { ok: false, error: "REDIS_UNAVAILABLE" };
  }

  const jobType = payload.jobType || "listing";
  if (!ML_JOB_TYPES.includes(jobType)) {
    return { ok: false, error: "INVALID_JOB_TYPE" };
  }

  try {
    const redis = await ensureRedisConnection();
    const baseUrl = env.app.url.replace(/\/$/, "");
    const absoluteImageUrls = (payload.imageUrls || []).map((url) => {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      return url;
    });

    const webhookUrl = `${baseUrl}/api/webhooks/vision?token=${encodeURIComponent(env.webhook.secret)}`;

    let petType = (payload.petType || "").toString().trim().toLowerCase();
    if (!PET_TYPES.includes(petType)) {
      petType = "";
    }

    const job = {
      jobType,
      listingId: payload.listingId?.toString() || null,
      ownedPetId: payload.ownedPetId?.toString() || null,
      imageUrls: absoluteImageUrls,
      webhookUrl,
      listingType: payload.listingType || "",
      petType,
      attempt: payload.attempt ?? 0,
    };

    await redis.xadd(IMAGE_QUEUE_STREAM, "*", { payload: JSON.stringify(job) });
    return { ok: true };
  } catch (err) {
    console.error("Enqueue failed:", err.message);
    return { ok: false, error: "ENQUEUE_FAILED" };
  }
}

/**
 * @param {Object} params
 * @param {import('mongoose').Types.ObjectId|string} params.listingId
 * @param {string[]} params.imageUrls
 * @param {string} params.listingType
 * @param {string} params.petType
 */
export async function enqueueListingProcessing({ listingId, imageUrls, listingType, petType }) {
  return enqueueImageJob({
    listingId: listingId.toString(),
    imageUrls,
    listingType,
    petType,
    jobType: "listing",
    attempt: 0,
  });
}

/**
 * @param {Object} params
 * @param {string} params.ownedPetId
 * @param {string} params.imageUrl
 * @param {string} params.petType
 */
export async function enqueueOwnedPetProcessing({ ownedPetId, imageUrl, petType }) {
  return enqueueImageJob({
    ownedPetId,
    imageUrls: [imageUrl],
    petType,
    jobType: "owned-pet",
    attempt: 0,
  });
}

/**
 * Staff/admin: reset listing ML status and push a new vision job.
 *
 * @param {import("mongoose").Document} listing
 * @returns {Promise<{ success: true } | { error: string, errorKey: string }>}
 */
export async function requeueListingProcessing(listing) {
  await connectDB();

  const imageUrls = (listing.images || []).map((img) => img.url).filter(Boolean);
  if (imageUrls.length < MIN_LISTING_IMAGES) {
    return { error: "NO_IMAGES", errorKey: processingErrorKey("NO_IMAGES") };
  }

  listing.processingStatus = "pending";
  listing.processingError = "";
  await listing.save();

  const enqueueResult = await enqueueListingProcessing({
    listingId: listing._id,
    imageUrls,
    listingType: listing.type,
    petType: listing.petType,
  });

  if (!enqueueResult.ok) {
    await markProcessingFailed(listing, enqueueResult.error || "ENQUEUE_FAILED");
    return {
      error: enqueueResult.error || "ENQUEUE_FAILED",
      errorKey: processingErrorKey(enqueueResult.error),
    };
  }

  return { success: true };
}

/**
 * Staff/admin: reset owned-pet ML status and push a new vision job.
 *
 * @param {import("mongoose").Document} pet
 * @returns {Promise<{ success: true } | { error: string, errorKey: string }>}
 */
export async function requeueOwnedPetProcessing(pet) {
  await connectDB();

  const imageUrl = pet.photo?.url;
  if (!imageUrl) {
    return { error: "NO_PHOTO", errorKey: processingErrorKey("NO_PHOTO") };
  }

  pet.processingStatus = "pending";
  pet.processingError = "";
  await pet.save();

  const enqueueResult = await enqueueOwnedPetProcessing({
    ownedPetId: pet._id.toString(),
    imageUrl,
    petType: pet.petType,
  });

  if (!enqueueResult.ok) {
    await markProcessingFailed(pet, enqueueResult.error || "ENQUEUE_FAILED");
    return {
      error: enqueueResult.error || "ENQUEUE_FAILED",
      errorKey: processingErrorKey(enqueueResult.error),
    };
  }

  return { success: true };
}

export { MAX_JOB_ATTEMPTS };
