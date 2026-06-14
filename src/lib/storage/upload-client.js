/** @file Browser-side image upload via presigned URLs (JPEG/PNG only). */

import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/storage/images";

function assertAllowedImageFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    const error = new Error("invalid_image_extension");
    error.code = "invalid_image_extension";
    throw error;
  }

  if (file.type && !ALLOWED_IMAGE_MIMES.includes(file.type)) {
    const error = new Error("invalid_image_type");
    error.code = "invalid_image_type";
    throw error;
  }
}

export { ALLOWED_IMAGE_ACCEPT };

async function presignUpload(file, prefix) {
  assertAllowedImageFile(file);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    file.type && ALLOWED_IMAGE_MIMES.includes(file.type)
      ? file.type
      : ext === "png"
        ? "image/png"
        : "image/jpeg";

  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, extension: ext, prefix }),
  });

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    const error = new Error(data.error || "Presign failed");
    error.code = data.error;
    throw error;
  }

  return presignRes.json();
}

function uploadWithProgress(uploadUrl, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid upload response"));
        }
        return;
      }
      let message = "Upload failed";
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.error) message = data.error;
      } catch {
        // ignore
      }
      const error = new Error(message);
      error.code = message;
      reject(error);
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.send(formData);
  });
}

export async function uploadImageFile(file, { prefix = "listings", onProgress } = {}) {
  const { uploadUrl, publicUrl, key } = await presignUpload(file, prefix);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  onProgress?.(0);
  const result = await uploadWithProgress(uploadUrl, formData, onProgress);
  onProgress?.(100);

  return { url: result.publicUrl || publicUrl, s3Key: key };
}
