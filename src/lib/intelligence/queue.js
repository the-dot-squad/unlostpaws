import { ensureRedisConnection, hasRedis } from "@/lib/redis";
import { IMAGE_QUEUE_STREAM, MAX_JOB_ATTEMPTS, ML_JOB_TYPES } from "@/config/constants/platform";
import { env } from "@/config/env";
import { PET_TYPES } from "@/config/constants/enums";

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
 * Push an image-processing job to the Redis stream.
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

    // Normalize petType to match the worker's strict validation
    let petType = (payload.petType || "").toString().trim().toLowerCase();
    if (!PET_TYPES.includes(petType)) {
      petType = "";
    }

    // Explicitly define the job contract fields passed to the worker
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
 * @param {import('mongoose').Types.ObjectId|string} listingId
 * @param {string[]} imageUrls
 * @param {string} listingType
 * @param {string} petType
 */
export async function retryListingProcessing(listingId, imageUrls, listingType, petType) {
  return enqueueListingProcessing({ listingId, imageUrls, listingType, petType });
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

export { MAX_JOB_ATTEMPTS };
