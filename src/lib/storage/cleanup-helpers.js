import path from "path";
import { readdir, stat } from "fs/promises";
import { Listing } from "@/models/listing";
import { ListingImage } from "@/models/listing-image";
import { OwnedPet } from "@/models/owned-pet";
import { listS3Objects, hasS3Backend } from "@/lib/storage/s3";
import { extractMediaKey } from "@/lib/storage/urls";
import { env } from "@/config/env";

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

  const fromProxy = extractMediaKey(imageOrUrl);
  if (fromProxy) return fromProxy;

  const publicUrl = env.storage.publicUrl;
  if (publicUrl && imageOrUrl.startsWith(publicUrl)) {
    return imageOrUrl.slice(publicUrl.length).replace(/^\/+/, "");
  }

  if (imageOrUrl.includes("/uploads/")) {
    const idx = imageOrUrl.indexOf("/uploads/");
    return imageOrUrl.slice(idx + "/uploads/".length);
  }

  if (!imageOrUrl.includes("://") && !imageOrUrl.startsWith("/")) {
    return imageOrUrl;
  }

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
 * @param {import("mongodb").Db} db
 */
export async function collectReferencedMediaKeys(db) {
  const referencedKeys = new Set();
  const referencedBasenames = new Set();

  function addReference(imageOrUrl) {
    const key = extractKeyFromImageOrUrl(imageOrUrl);
    if (key) {
      referencedKeys.add(key);
      referencedBasenames.add(path.basename(key));
    }
  }

  for await (const listing of Listing.find({}, { "images.s3Key": 1, "images.url": 1 }).cursor()) {
    if (listing.images) {
      for (const img of listing.images) {
        addReference(img);
      }
    }
  }

  for await (const img of ListingImage.find({}, { s3Key: 1, url: 1 }).cursor()) {
    addReference(img);
  }

  for await (const pet of OwnedPet.find({}, { photo: 1, photo2: 1, passportPhoto: 1 }).cursor()) {
    addReference(pet.photo);
    addReference(pet.photo2);
    addReference(pet.passportPhoto);
  }

  const userCursor = db.collection("user").find({}, { projection: { image: 1 } });
  for await (const user of userCursor) {
    addReference(user.image);
  }

  return { referencedKeys, referencedBasenames };
}

export async function listStoredMediaFiles() {
  const allStoredFiles = [];

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

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  try {
    const localFilenames = await readdir(uploadDir);
    for (const filename of localFilenames) {
      if (filename === ".gitkeep" || filename === ".DS_Store") continue;
      const filePath = path.join(uploadDir, filename);
      try {
        const stats = await stat(filePath);
        allStoredFiles.push({
          key: filename,
          basename: filename,
          lastModified: stats.mtime,
          size: stats.size,
          isS3: false,
          filePath,
        });
      } catch (_err) {
        // Skip inaccessible local upload entries.
      }
    }
  } catch (_err) {
    // Local uploads directory may be absent in CI or S3-only environments.
  }

  return allStoredFiles;
}

/**
 * @param {object} params
 */
export async function deleteUnreferencedMediaFiles({
  allStoredFiles,
  referencedKeys,
  referencedBasenames,
  maxAgeHours,
  deleteObjectFn,
}) {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);

  let deletedCount = 0;
  let deletedBytes = 0;
  const deletedKeys = [];

  for (const file of allStoredFiles) {
    if (file.lastModified > cutoffTime) {
      continue;
    }

    const isReferenced = file.isS3
      ? referencedKeys.has(file.key) || referencedBasenames.has(file.basename)
      : referencedBasenames.has(file.basename);

    if (!isReferenced) {
      try {
        await deleteObjectFn(file.key);
        deletedCount++;
        deletedBytes += file.size;
        deletedKeys.push(file.key);
      } catch (err) {
        console.error(`[cleanup] Failed to delete orphan file ${file.key}:`, err);
      }
    }
  }

  return { deletedCount, deletedBytes, deletedKeys };
}
