/** @file Cleanup service to identify and delete unattached/orphan media files. */

import { connectDB, getMongoDb } from "@/config/db";
import { deleteObject } from "@/lib/storage/s3";
import {
  collectReferencedMediaKeys,
  deleteUnreferencedMediaFiles,
  extractKeyFromImageOrUrl,
  listStoredMediaFiles,
} from "@/lib/storage/cleanup-helpers";

export { extractKeyFromImageOrUrl };

/**
 * Scan database records and storage buckets to identify and delete orphan media files.
 *
 * @param {object} [options]
 * @param {number} [options.maxAgeHours] File age in hours before deletion (default: 24).
 */
export async function pruneOrphanUploads({ maxAgeHours = 24 } = {}) {
  await connectDB();
  const db = await getMongoDb();

  const { referencedKeys, referencedBasenames } = await collectReferencedMediaKeys(db);
  const allStoredFiles = await listStoredMediaFiles();
  const { deletedCount, deletedBytes, deletedKeys } = await deleteUnreferencedMediaFiles({
    allStoredFiles,
    referencedKeys,
    referencedBasenames,
    maxAgeHours,
    deleteObjectFn: deleteObject,
  });

  return {
    success: true,
    scanned: allStoredFiles.length,
    deleted: deletedCount,
    freedBytes: deletedBytes,
    deletedKeys,
  };
}
