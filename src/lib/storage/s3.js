/** @file S3-compatible object storage with a local filesystem fallback for development. */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import { imageContentTypeFromExtension } from "@/lib/storage/images";
import crypto from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

/** App API route used for browser uploads (avoids direct S3 CORS configuration). */
export const UPLOAD_API_PATH = "/api/upload/put";

let s3Client = null;

export function isS3Storage() {
  return env.storage.mode === "s3";
}

/** True when S3/R2 credentials exist (even if STORAGE_MODE is local due to missing S3_PUBLIC_URL). */
export function hasS3Backend() {
  const s = env.storage;
  return Boolean(s.endpoint && s.accessKey && s.secretKey && s.bucket);
}

function getS3Client() {
  if (!hasS3Backend()) {
    throw new Error("S3 storage is not configured — set S3_* env vars");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: env.storage.region,
      endpoint: env.storage.endpoint,
      credentials: {
        accessKeyId: env.storage.accessKey,
        secretAccessKey: env.storage.secretKey,
      },
      forcePathStyle: env.storage.forcePathStyle,
    });
  }

  return s3Client;
}

async function readLocalObject(key) {
  const filePath = path.join(process.cwd(), "public", "uploads", path.basename(key));
  const body = await readFile(filePath);
  const ext = path.extname(key).slice(1).toLowerCase();
  return { body, contentType: imageContentTypeFromExtension(ext) };
}

async function readS3Object(key) {
  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.storage.bucket,
      Key: key,
    })
  );

  const body = Buffer.from(await response.Body.transformToByteArray());
  return {
    body,
    contentType: response.ContentType || "application/octet-stream",
  };
}

/**
 * Build the public URL for an object key.
 * `S3_PUBLIC_URL` must be set explicitly (CDN domain or `http://localhost:3000/api/media`).
 */
export function getPublicUrl(key) {
  if (isS3Storage()) {
    return `${env.storage.publicUrl}/${key}`;
  }

  if (hasS3Backend() && !key.startsWith("dev/")) {
    return `/api/media/${key}`;
  }

  return `/uploads/${path.basename(key)}`;
}

export async function createPresignedUpload({
  userId,
  contentType,
  extension = "jpg",
  prefix = "listings",
}) {
  const keyPrefix = isS3Storage() || hasS3Backend() ? prefix : "dev";
  const key = `${keyPrefix}/${userId}/${crypto.randomUUID()}.${extension}`;

  if (isS3Storage()) {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: env.storage.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    return {
      key,
      uploadUrl,
      publicUrl: getPublicUrl(key),
      contentType,
    };
  }

  return {
    key,
    uploadUrl: UPLOAD_API_PATH,
    publicUrl: `/api/media/${key}`,
    contentType,
  };
}

export async function uploadObject({ key, body, contentType }) {
  if (!isS3Storage() && !hasS3Backend()) {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, path.basename(key));
    await writeFile(filePath, body);
    return { publicUrl: getPublicUrl(key) };
  }

  if (hasS3Backend()) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: env.storage.bucket,
        Key: key,
        ContentType: contentType,
        Body: body,
      })
    );
    return { publicUrl: isS3Storage() ? getPublicUrl(key) : `/api/media/${key}` };
  }

  return readLocalObject(key).then(() => ({ publicUrl: getPublicUrl(key) }));
}

/**
 * Fetch object bytes — local disk first, then S3/R2 when credentials exist.
 */
export async function getObject(key) {
  if (isS3Storage()) {
    return readS3Object(key);
  }

  try {
    return await readLocalObject(key);
  } catch {
    if (hasS3Backend()) {
      return readS3Object(key);
    }
    throw new Error("Object not found");
  }
}

export async function deleteObject(key) {
  if (!key) return;

  if (hasS3Backend()) {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.storage.bucket,
        Key: key,
      })
    );
  }

  try {
    const filePath = path.join(process.cwd(), "public", "uploads", path.basename(key));
    await unlink(filePath);
  } catch {
    // Local dev file may not exist when using remote storage only.
  }
}

/**
 * List all object keys, last modified dates, and sizes under a given prefix in S3.
 * Returns an empty array if S3 is not configured.
 */
export async function listS3Objects(prefix) {
  if (!hasS3Backend()) return [];

  const client = getS3Client();
  let objects = [];
  let isTruncated = true;
  let continuationToken = undefined;

  while (isTruncated) {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: env.storage.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (!obj.Key) continue;
        objects.push({
          key: obj.Key,
          lastModified: obj.LastModified ? new Date(obj.LastModified) : new Date(0),
          size: obj.Size ?? 0,
        });
      }
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  return objects;
}
