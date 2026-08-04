/** @file Server-side avatar resize and JPEG compression before storage. */

import sharp from "sharp";

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 75;

/**
 * Resize and compress an avatar image for storage.
 * @param {Buffer} buffer
 * @returns {Promise<{ buffer: Buffer, contentType: string, extension: string }>}
 */
export async function processAvatarBuffer(buffer) {
  const processed = await sharp(buffer)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    buffer: processed,
    contentType: "image/jpeg",
    extension: "jpg",
  };
}
