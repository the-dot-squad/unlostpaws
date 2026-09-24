/** @file Cleanup service to identify and delete unattached/orphan media files. */

import { connectDB } from "@/config/db";
import { deleteObjects } from "@/lib/storage/s3";
import { cutoffBeforeHours } from "@/lib/storage/constants";
import { Upload } from "@/models/upload";

/**
 * Ensure every storage key has an Upload owned by the given user.
 * Rejects missing keys and uploads belonging to another user.
 *
 * @param {string | string[]} keys
 * @param {string} userId
 * @returns {Promise<{ ok: true } | { ok: false, error: "upload_invalid" }>}
 */
export async function assertUploadsOwnedByUser(keys, userId) {
  const keyList = [...new Set((Array.isArray(keys) ? keys : [keys]).filter(Boolean))];
  if (!keyList.length) return { ok: true };

  const uploads = await Upload.find({ key: { $in: keyList } })
    .select({ key: 1, userId: 1 })
    .lean();

  if (uploads.length !== keyList.length) {
    return { ok: false, error: "upload_invalid" };
  }
  if (uploads.some((upload) => upload.userId !== userId)) {
    return { ok: false, error: "upload_invalid" };
  }
  return { ok: true };
}

/**
 * Mark upload tracking documents as attached after media is linked to a record.
 * @param {string | string[]} keys
 */
export async function markUploadsAttached(keys) {
  const keyList = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  if (!keyList.length) return;

  await Upload.updateMany({ key: { $in: keyList } }, { $set: { status: "attached" } });
}

/**
 * Scan the indexed Upload collection to identify and bulk-delete orphan media files.
 *
 * @param {object} [options]
 * @param {number} [options.maxAgeHours] File age in hours before deletion (default: 24).
 */
export async function pruneOrphanUploads({ maxAgeHours = 24 } = {}) {
  await connectDB();

  const cutoffTime = cutoffBeforeHours(maxAgeHours);

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

  await deleteObjects(orphanKeys);

  return {
    success: true,
    scanned: orphans.length,
    deleted: orphanKeys.length,
    freedBytes: 0,
    deletedKeys: orphanKeys,
  };
}
