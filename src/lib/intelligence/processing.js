/** @file ML processing status helpers — fail markers and admin-facing error keys. */

/**
 * Mark a document's ML processing as failed after enqueue errors.
 *
 * @param {import("mongoose").Document} doc
 * @param {string} [errorCode]
 */
export async function markProcessingFailed(doc, errorCode = "ENQUEUE_FAILED") {
  doc.processingStatus = "failed";
  doc.processingError = errorCode;
  await doc.save();
}

/**
 * Map stored processingError codes for admin UI (never dump raw worker text).
 *
 * @param {string} [raw]
 * @returns {string}
 */
export function processingErrorKey(raw) {
  const code = String(raw || "").trim();
  if (!code) return "generic";

  const upper = code.toUpperCase();
  if (upper === "REDIS_UNAVAILABLE") return "redisUnavailable";
  if (upper === "ENQUEUE_FAILED") return "enqueueFailed";
  if (upper === "INVALID_JOB_TYPE") return "enqueueFailed";
  if (upper === "NO_IMAGES" || upper === "NO_PHOTO") return "noImages";

  return "generic";
}
