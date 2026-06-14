"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { X, Upload } from "lucide-react";
import Image from "next/image";
import { uploadImageFile, ALLOWED_IMAGE_ACCEPT } from "@/lib/storage/upload-client";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";
import { extractGpsFromImageFile } from "@/lib/exif-gps";
import { UploadProgressOverlay } from "@/components/shared/upload-progress";
import { MAX_LISTING_IMAGES, MIN_LISTING_IMAGES } from "@/config/constants/enums";

export function ImageUploader({ images, onChange, hint, onGpsFound }) {
  const t = useTranslations("upload");
  const [pending, setPending] = useState([]);
  const previewsRef = useRef(new Set());
  const imagesRef = useRef(images);
  const pendingRef = useRef(pending);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    const previews = previewsRef.current;
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview);
      }
      previews.clear();
    };
  }, []);

  function trackPreview(url) {
    previewsRef.current.add(url);
    return url;
  }

  function releasePreview(url) {
    if (!url) return;
    URL.revokeObjectURL(url);
    previewsRef.current.delete(url);
  }

  function updatePending(id, patch) {
    setPending((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removePending(id) {
    setPending((items) => {
      const target = items.find((item) => item.id === id);
      releasePreview(target?.preview);
      const next = items.filter((item) => item.id !== id);
      pendingRef.current = next;
      return next;
    });
  }

  function appendUploaded(uploaded) {
    const next = [...imagesRef.current, uploaded];
    imagesRef.current = next;
    onChange(next);
  }

  async function uploadOne(upload) {
    try {
      const uploaded = await uploadImageFile(upload.file, {
        onProgress: (progress) => updatePending(upload.id, { progress, error: null }),
      });

      removePending(upload.id);
      appendUploaded(uploaded);
    } catch (err) {
      console.error(err);
      const message =
        err.code === "invalid_image_extension"
          ? t("invalidExtension")
          : err.code === "invalid_image_type"
            ? t("invalidType")
            : t("failed");
      updatePending(upload.id, { error: message, progress: 0 });
    }
  }

  function handleFiles(fileList) {
    if (!fileList?.length) return;

    const uploads = [];

    for (const file of fileList) {
      const slotsUsed = imagesRef.current.length + pendingRef.current.length + uploads.length;
      if (slotsUsed >= MAX_LISTING_IMAGES) break;
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) continue;

      if (onGpsFound) {
        extractGpsFromImageFile(file).then((gps) => {
          if (gps) onGpsFound(gps);
        });
      }

      const id = crypto.randomUUID();
      const preview = trackPreview(URL.createObjectURL(file));
      uploads.push({ id, file, preview, progress: 0, error: null });
    }

    if (!uploads.length) return;

    setPending((items) => {
      const next = [...items, ...uploads];
      pendingRef.current = next;
      return next;
    });

    void Promise.allSettled(uploads.map((upload) => uploadOne(upload)));
  }

  function removeImage(index) {
    const next = images.filter((_, i) => i !== index);
    imagesRef.current = next;
    onChange(next);
  }

  const isUploading = pending.some((item) => !item.error);
  const slotsUsed = images.length + pending.length;
  const atCapacity = slotsUsed >= MAX_LISTING_IMAGES;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.s3Key || img.url} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <Image
              src={img.url}
              alt=""
              fill
              className="object-cover"
              sizes="150px"
              priority={i === 0}
              unoptimized={img.url.startsWith("/api/media")}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute end-1 top-1 size-6"
              onClick={() => removeImage(i)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}

        {pending.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.preview} alt="" className="size-full object-cover" />
            <UploadProgressOverlay
              progress={item.progress}
              label={t("percent", { percent: item.progress })}
              error={item.error}
            />
            {item.error && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute end-1 top-1 size-6"
                onClick={() => removePending(item.id)}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        ))}

        {!atCapacity && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors hover:bg-muted/50">
            <Upload className="size-6 text-muted-foreground" />
            <span className="px-2 text-center text-xs text-muted-foreground">{t("addPhotos")}</span>
            <span className="px-2 text-center text-[10px] text-muted-foreground">{t("formatsHint")}</span>
            <input
              type="file"
              accept={ALLOWED_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {isUploading && (
        <p className="text-sm text-muted-foreground">{t("uploading")}</p>
      )}

      {images.length < MIN_LISTING_IMAGES && !isUploading && (
        <p className="text-sm text-destructive">
          {MIN_LISTING_IMAGES - images.length} more image(s) required
        </p>
      )}
    </div>
  );
}
