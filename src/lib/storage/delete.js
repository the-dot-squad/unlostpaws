import { deleteObject } from "@/lib/storage/s3";
import { extractMediaKey } from "@/lib/storage/urls";

/**
 * Resolve an object storage key from a stored image reference or raw key/URL.
 * Returns null for external URLs (e.g. OAuth avatars).
 */
export function resolveStorageKey(imageOrKey) {
  if (!imageOrKey) return null;

  if (typeof imageOrKey === "string") {
    const fromProxy = extractMediaKey(imageOrKey);
    if (fromProxy) return fromProxy;
    if (!imageOrKey.includes("://") && !imageOrKey.startsWith("/")) {
      return imageOrKey;
    }
    return null;
  }

  return imageOrKey.s3Key || extractMediaKey(imageOrKey.url) || null;
}

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
