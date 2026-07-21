import { deleteObject } from "@/lib/storage/s3";
import { resolveStorageKey } from "@/lib/storage/urls";

export { resolveStorageKey };

/** Delete a stored upload from S3/R2 and local dev disk (best-effort). */
export async function deleteStoredMedia(imageOrKey) {
  const key = resolveStorageKey(imageOrKey);
  if (!key) return;

  try {
    await deleteObject(key);
  } catch {
    // Storage may be unavailable in some environments.
  }
}
