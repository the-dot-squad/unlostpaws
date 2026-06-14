/** @file Allowed image types (JPEG/PNG only), extension mapping, and magic-byte validation. */

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png"];

/** Value for `<input accept="...">` on upload fields. */
export const ALLOWED_IMAGE_ACCEPT = "image/jpeg,image/png";

export const IMAGE_CONTENT_TYPES_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** @param {string} ext */
export function imageContentTypeFromExtension(ext) {
  return IMAGE_CONTENT_TYPES_BY_EXT[ext?.toLowerCase()] || "application/octet-stream";
}

/** @param {string} ext */
export function isAllowedImageExtension(ext) {
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext?.toLowerCase());
}

/**
 * Detect image MIME from file header bytes (JPEG and PNG only).
 * @param {Buffer} buffer
 * @returns {string | null}
 */
export function detectImageMime(buffer) {
  if (!buffer || buffer.length < 3) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  return null;
}

/**
 * Verify buffer matches an allowed image type and optional declared MIME.
 * @param {Buffer} buffer
 * @param {string} [declaredMime]
 * @returns {{ ok: true, mime: string } | { ok: false, reason: "invalid_image_type" | "invalid_image_extension" }}
 */
export function validateImageBuffer(buffer, declaredMime) {
  const detected = detectImageMime(buffer);
  if (!detected || !ALLOWED_IMAGE_MIMES.includes(detected)) {
    return { ok: false, reason: "invalid_image_type" };
  }

  if (declaredMime && declaredMime !== "application/octet-stream" && declaredMime !== detected) {
    return { ok: false, reason: "invalid_image_type" };
  }

  return { ok: true, mime: detected };
}
