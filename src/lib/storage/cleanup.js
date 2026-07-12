/** @file Cleanup service to identify and delete unattached/orphan media files. */

import { connectDB } from "@/config/db";
import { deleteObjects } from "@/lib/storage/s3";
import { Upload } from "@/models/upload";
import { extractKeyFromImageOrUrl } from "@/lib/storage/cleanup-helpers";

export { extractKeyFromImageOrUrl };

/**
 * Scan the indexed Upload collection to identify and bulk-delete orphan media files.
 *
 * @param {object} [options]
 * @param {number} [options.maxAgeHours] File age in hours before deletion (default: 24).
 */
export async function pruneOrphanUploads({ maxAgeHours = 24 } = {}) {
  await connectDB();

  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  // Find pending uploads older than cutoffTime
  const orphans = await Upload.find({
    status: "pending",
    createdAt: { $lt: cutoffTime },
  }).lean();

  if (!orphans.length) {
    return {
      success: true,
      scanned: 0,
      deleted: 0,
      freedBytes: 0,
      deletedKeys: [],
    };
  }

  const orphanKeys = orphans.map((o) => o.key);

  // Bulk delete from S3/R2 and local dev storage, and remove tracking documents
  await deleteObjects(orphanKeys);

  return {
    success: true,
    scanned: orphans.length,
    deleted: orphanKeys.length,
    freedBytes: 0,
    deletedKeys: orphanKeys,
  };
}
