/** @file Shared storage path and prefix constants. */

import path from "path";

/** S3/local object key prefixes for user-uploaded media. */
export const MEDIA_PREFIXES = ["listings/", "pets/", "avatars/", "content/", "dev/"];

/** Local dev uploads directory (public/uploads). */
export const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

/** Resolve a local filesystem path for an object key (basename only). */
export function localUploadPath(key) {
  return path.join(LOCAL_UPLOADS_DIR, path.basename(key));
}

/** Cutoff date for files older than the given number of hours. */
export function cutoffBeforeHours(maxAgeHours) {
  return new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
}
