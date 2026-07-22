/**
 * Image intelligence pipeline — queue, processing status, vector sync, match cron.
 * Server-only: do not import this barrel from Client Components (pulls Mongo/Redis).
 *
 * @module @/lib/intelligence
 */

export {
  enqueueListingProcessing,
  enqueueOwnedPetProcessing,
  requeueListingProcessing,
  requeueOwnedPetProcessing,
} from "@/lib/intelligence/queue";

export { markProcessingFailed, processingErrorKey } from "@/lib/intelligence/processing";

export {
  syncListingImageStatus,
  syncListingImageStatusBulk,
} from "@/lib/intelligence/sync/listing-images";

export { syncOwnedPetStatus } from "@/lib/intelligence/sync/owned-pets";

export { reprocessListingMatches } from "@/lib/intelligence/matching/reprocess";
