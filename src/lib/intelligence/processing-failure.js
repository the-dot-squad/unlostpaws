/** @file Shared ML processing failure helpers. */

/**
 * Mark a document's ML processing as failed after enqueue errors.
 * @param {import("mongoose").Document} doc
 * @param {string} [errorCode]
 */
export async function markProcessingFailed(doc, errorCode = "ENQUEUE_FAILED") {
  doc.processingStatus = "failed";
  doc.processingError = errorCode;
  await doc.save();
}
