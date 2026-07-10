"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Upload, AlertCircle } from "lucide-react";
import Image from "next/image";
import { uploadImageFile, ALLOWED_IMAGE_ACCEPT } from "@/lib/storage/upload-client";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";
import { extractGpsFromImageFile } from "@/lib/exif-gps";
import { UploadProgressOverlay } from "@/components/shared/upload-progress";
import { MAX_LISTING_IMAGES, MIN_LISTING_IMAGES } from "@/config/constants/enums";

const BLOCKING_ERROR_CODES = new Set([
  "listing_limit_daily",
  "listing_limit_monthly",
  "upload_daily_limit",
  "rate_limit_exceeded",
  "rate_limit_unavailable",
  "user_banned",
]);

export function ImageUploader({ images, onChange, hint, onGpsFound, onBlockedChange }) {
  const t = useTranslations("upload");
  const [pending, setPending] = useState([]);
  const [blocked, setBlocked] = useState(null);
  const previewsRef = useRef(new Set());
  const imagesRef = useRef(images);
  const pendingRef = useRef(pending);
  const blockedRef = useRef(blocked);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

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

  function clearPending() {
    setPending((items) => {
      for (const item of items) {
        releasePreview(item.preview);
      }
      pendingRef.current = [];
      return [];
    });
  }

  function appendUploaded(uploaded) {
    const next = [...imagesRef.current, uploaded];
    imagesRef.current = next;
    onChange(next);
  }

  function resolveErrorMessage(code) {
    switch (code) {
      case "invalid_image_extension":
        return t("invalidExtension");
      case "invalid_image_type":
        return t("invalidType");
      case "listing_limit_daily":
        return t("listingLimitDaily");
      case "listing_limit_monthly":
        return t("listingLimitMonthly");
      case "upload_daily_limit":
        return t("uploadDailyLimit");
      case "rate_limit_exceeded":
        return t("rateLimitExceeded");
      case "rate_limit_unavailable":
        return t("rateLimitUnavailable");
      case "user_banned":
        return t("userBanned");
      default:
        return t("failed");
    }
  }

  function applyBlockingError(code) {
    if (blockedRef.current) return;
    const message = resolveErrorMessage(code);
    const next = { code, message };
    blockedRef.current = next;
    setBlocked(next);
    onBlockedChange?.(true, next);
    clearPending();
  }

  async function uploadOne(upload) {
    if (blockedRef.current) return;

    try {
      const uploaded = await uploadImageFile(upload.file, {
        onProgress: (progress) => updatePending(upload.id, { progress, error: null }),
      });

      removePending(upload.id);
      appendUploaded(uploaded);
    } catch (err) {
      console.error(err);
      const code = err.code || "";

      if (BLOCKING_ERROR_CODES.has(code)) {
        applyBlockingError(code);
        return;
      }

      updatePending(upload.id, { error: resolveErrorMessage(code), progress: 0 });
    }
  }

  function handleFiles(fileList) {
    if (!fileList?.length || blockedRef.current) return;

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
    if (blocked) return;
    const next = images.filter((_, i) => i !== index);
    imagesRef.current = next;
    onChange(next);
  }

  const isUploading = pending.some((item) => !item.error);
  const slotsUsed = images.length + pending.length;
  const atCapacity = slotsUsed >= MAX_LISTING_IMAGES;
  const uploadsLocked = Boolean(blocked);

  return (
    <div className="space-y-3">
      {blocked && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{blocked.message}</AlertDescription>
        </Alert>
      )}

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
            {!uploadsLocked && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute end-1 top-1 size-6"
                onClick={() => removeImage(i)}
              >
                <X className="size-3" />
              </Button>
            )}
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

        {!atCapacity && !uploadsLocked && (
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

      {!uploadsLocked && images.length < MIN_LISTING_IMAGES && !isUploading && (
        <p className="text-sm text-destructive">
          {t("imagesRemaining", { count: MIN_LISTING_IMAGES - images.length })}
        </p>
      )}
    </div>
  );
}
