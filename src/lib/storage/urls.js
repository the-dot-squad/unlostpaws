/** @file Resolve stored image keys to browser-facing URLs. */

import path from "path";
import { env } from "@/config/env";
import { getPublicUrl, hasS3Backend, isS3Storage } from "@/lib/storage/s3";
import { MEDIA_PREFIXES } from "@/lib/storage/constants";

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
 * Resolve an object storage key from a stored image reference or raw key/URL.
 * Returns null for external URLs (e.g. OAuth avatars).
 */
export function resolveStorageKey(imageOrKey) {
  if (!imageOrKey) return null;

  if (typeof imageOrKey === "object") {
    if (imageOrKey.s3Key) return imageOrKey.s3Key;
    if (imageOrKey.url) return resolveStorageKey(imageOrKey.url);
    return null;
  }

  if (typeof imageOrKey !== "string") return null;

  const fromProxy = extractMediaKey(imageOrKey);
  if (fromProxy) return fromProxy;

  const publicUrl = env.storage.publicUrl;
  if (publicUrl && imageOrKey.startsWith(publicUrl)) {
    return imageOrKey.slice(publicUrl.length).replace(/^\/+/, "");
  }

  if (imageOrKey.includes("/uploads/")) {
    const idx = imageOrKey.indexOf("/uploads/");
    return imageOrKey.slice(idx + "/uploads/".length);
  }

  if (!imageOrKey.includes("://") && !imageOrKey.startsWith("/")) {
    return imageOrKey;
  }

  for (const prefix of MEDIA_PREFIXES) {
    const idx = imageOrKey.indexOf(prefix);
    if (idx !== -1) {
      return imageOrKey.slice(idx);
    }
  }

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
