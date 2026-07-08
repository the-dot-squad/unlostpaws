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

function uploadWithProgress(uploadUrl, file, key, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const isLocal = uploadUrl.startsWith("/");
    if (isLocal) {
      xhr.open("POST", uploadUrl);
    } else {
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (isLocal) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Invalid upload response"));
          }
        } else {
          resolve({});
        }
        return;
      }
      let message = "Upload failed";
      if (isLocal) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) message = data.error;
        } catch {
          // ignore
        }
      }
      const error = new Error(message);
      error.code = message;
      reject(error);
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    if (isLocal) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", key);
      xhr.send(formData);
    } else {
      xhr.send(file);
    }
  });
}

export async function uploadImageFile(file, { prefix = "listings", onProgress } = {}) {
  const { uploadUrl, publicUrl, key } = await presignUpload(file, prefix);

  onProgress?.(0);
  await uploadWithProgress(uploadUrl, file, key, onProgress);
  onProgress?.(100);

  return {
    url: publicUrl,
    s3Key: key,
    bytes: file.size,
    contentType: file.type || (key.endsWith(".png") ? "image/png" : "image/jpeg"),
  };
}
