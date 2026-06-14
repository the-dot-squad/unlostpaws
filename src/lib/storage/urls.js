/** @file Resolve stored image keys to browser-facing URLs. */

import path from "path";
import { getPublicUrl, hasS3Backend, isS3Storage } from "@/lib/storage/s3";

/** App proxy path for object keys (works without S3_PUBLIC_URL). */
export function getMediaProxyUrl(key) {
  return `/api/media/${key}`;
}

/** Extract object key from a /api/media/... or full public URL. */
export function extractMediaKey(url) {
  if (!url) return null;
  const marker = "/api/media/";
  const idx = url.indexOf(marker);
  if (idx !== -1) return url.slice(idx + marker.length);
  return null;
}

/**
 * Resolve a display URL for a stored image reference.
 * Never rewrites a working /api/media/ URL to /uploads/.
 */
export function resolveImageUrl(image) {
  if (!image) return null;

  const key = image.s3Key || extractMediaKey(image.url);

  if (image.url?.startsWith("/api/media/")) {
    return image.url;
  }

  if (!key) return image.url ?? null;

  if (isS3Storage()) {
    return getPublicUrl(key);
  }

  if (hasS3Backend() && !key.startsWith("dev/")) {
    return getMediaProxyUrl(key);
  }

  return `/uploads/${path.basename(key)}`;
}

/** Map listing/pet images to resolved URLs (server-side). */
export function resolveImages(images) {
  return (images || []).map((img) => ({
    ...img,
    url: resolveImageUrl(img),
  }));
}
