/** @file Cleanup service to identify and delete unattached/orphan media files. */

import { connectDB, getMongoDb } from "@/config/db";
import { Listing } from "@/models/listing";
import { ListingImage } from "@/models/listing-image";
import { OwnedPet } from "@/models/owned-pet";
import { listS3Objects, deleteObject, hasS3Backend } from "@/lib/storage/s3";
import { extractMediaKey } from "@/lib/storage/urls";
import { env } from "@/config/env";
import path from "path";
import { readdir, stat } from "fs/promises";

/**
 * Robustly extract S3 key or basename from any image reference object or URL.
 */
export function extractKeyFromImageOrUrl(imageOrUrl) {
  if (!imageOrUrl) return null;

  if (typeof imageOrUrl === "object") {
    if (imageOrUrl.s3Key) return imageOrUrl.s3Key;
    if (imageOrUrl.url) return extractKeyFromImageOrUrl(imageOrUrl.url);
    return null;
  }

  if (typeof imageOrUrl !== "string") return null;

  // Case 1: Proxy URL containing "/api/media/"
  const fromProxy = extractMediaKey(imageOrUrl);
  if (fromProxy) return fromProxy;

  // Case 2: S3 direct URL starts with S3 public URL
  const publicUrl = env.storage.publicUrl;
  if (publicUrl && imageOrUrl.startsWith(publicUrl)) {
    return imageOrUrl.slice(publicUrl.length).replace(/^\/+/, "");
  }

  // Case 3: Local uploads path "/uploads/uuid.ext"
  if (imageOrUrl.includes("/uploads/")) {
    const idx = imageOrUrl.indexOf("/uploads/");
    return imageOrUrl.slice(idx + "/uploads/".length);
  }

  // Case 4: Raw key
  if (!imageOrUrl.includes("://") && !imageOrUrl.startsWith("/")) {
    return imageOrUrl;
  }

  // Fallback: Check if it contains any of the known prefixes (e.g. listings/, pets/, avatars/)
  const prefixes = ["listings/", "pets/", "avatars/", "content/", "dev/"];
  for (const prefix of prefixes) {
    const idx = imageOrUrl.indexOf(prefix);
    if (idx !== -1) {
      return imageOrUrl.slice(idx);
    }
  }

  return null;
}

/**
 * Scan database records and storage buckets to identify and delete files
 * that are no longer attached to any listing, pet, or user avatar.
 *
 * @param {object} [options]
 * @param {number} [options.maxAgeHours] File age in hours before it is eligible for deletion (default: 24).
 * @returns {Promise<{ success: boolean, scanned: number, deleted: number, freedBytes: number, deletedKeys: string[] }>}
 */
export async function pruneOrphanUploads({ maxAgeHours = 24 } = {}) {
  await connectDB();
  const db = await getMongoDb();

  const referencedKeys = new Set();
  const referencedBasenames = new Set();

  function addReference(imageOrUrl) {
    const key = extractKeyFromImageOrUrl(imageOrUrl);
    if (key) {
      referencedKeys.add(key);
      referencedBasenames.add(path.basename(key));
    }
  }

  // 1. GATHER DATABASE REFERENCES
  
  // A. Listings
  const listings = await Listing.find({}, { "images.s3Key": 1, "images.url": 1 }).lean();
  for (const listing of listings) {
    if (listing.images) {
      for (const img of listing.images) {
        addReference(img);
      }
    }
  }

  // B. ListingImages (denormalized ML vector metadata)
  const listingImages = await ListingImage.find({}, { s3Key: 1, url: 1 }).lean();
  for (const img of listingImages) {
    addReference(img);
  }

  // C. OwnedPets
  const pets = await OwnedPet.find({}, { photo: 1, photo2: 1, passportPhoto: 1 }).lean();
  for (const pet of pets) {
    addReference(pet.photo);
    addReference(pet.photo2);
    addReference(pet.passportPhoto);
  }

  // D. Users (profile pictures / avatars)
  const users = await db.collection("user").find({}, { projection: { image: 1 } }).toArray();
  for (const user of users) {
    addReference(user.image);
  }

  // 2. GATHER ACTIVE FILES FROM STORAGE
  const allStoredFiles = [];

  // A. S3/R2 Bucket
  if (hasS3Backend()) {
    const prefixes = ["listings/", "pets/", "avatars/", "content/", "dev/"];
    for (const prefix of prefixes) {
      try {
        const s3Objs = await listS3Objects(prefix);
        for (const obj of s3Objs) {
          allStoredFiles.push({
            key: obj.key,
            basename: path.basename(obj.key),
            lastModified: obj.lastModified,
            size: obj.size,
            isS3: true,
          });
        }
      } catch (err) {
        console.error(`[cleanup] Failed to list S3 prefix ${prefix}:`, err);
      }
    }
  }

  // B. Local Filesystem (public/uploads)
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  try {
    const localFilenames = await readdir(uploadDir);
    for (const filename of localFilenames) {
      if (filename === ".gitkeep" || filename === ".DS_Store") continue;
      const filePath = path.join(uploadDir, filename);
      try {
        const stats = await stat(filePath);
        allStoredFiles.push({
          key: filename, // For local dev, key is just the flat filename
          basename: filename,
          lastModified: stats.mtime,
          size: stats.size,
          isS3: false,
          filePath,
        });
      } catch {
        // Skip inaccessible/missing files
      }
    }
  } catch (err) {
    // Directory may not exist in CI or pure S3 environments, safe to ignore
  }

  // 3. IDENTIFY AND DELETE UNREFERENCED FILES
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);

  let deletedCount = 0;
  let deletedBytes = 0;
  const deletedKeys = [];

  for (const file of allStoredFiles) {
    // Only delete files older than maxAgeHours
    if (file.lastModified > cutoffTime) {
      continue;
    }

    const isReferenced = file.isS3
      ? referencedKeys.has(file.key) || referencedBasenames.has(file.basename)
      : referencedBasenames.has(file.basename);

    if (!isReferenced) {
      try {
        await deleteObject(file.key);
        deletedCount++;
        deletedBytes += file.size;
        deletedKeys.push(file.key);
      } catch (err) {
        console.error(`[cleanup] Failed to delete orphan file ${file.key}:`, err);
      }
    }
  }

  return {
    success: true,
    scanned: allStoredFiles.length,
    deleted: deletedCount,
    freedBytes: deletedBytes,
    deletedKeys,
  };
}
