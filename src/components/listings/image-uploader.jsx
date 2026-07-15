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

function resolveErrorMessage(code, t) {
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

function filterValidFiles(fileList, slotsUsedCount) {
  const valid = [];
  let slots = slotsUsedCount;
  for (const file of fileList) {
    if (slots >= MAX_LISTING_IMAGES) break;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      valid.push(file);
      slots++;
    }
  }
  return valid;
}

function createUploadItem(file, trackPreview) {
  const id = crypto.randomUUID();
  const preview = trackPreview(URL.createObjectURL(file));
  return { id, file, preview, progress: 0, error: null };
}

/** Custom hook to abstract object URL tracking and prevent memory leaks. */
function useObjectURLs() {
  const urlsRef = useRef(new Set());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const track = (url) => {
    urlsRef.current.add(url);
    return url;
  };

  const release = (url) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };

  return { track, release };
}

function UploadedImageItem({ img, index, uploadsLocked, onRemove }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
      <Image
        src={img.url}
        alt=""
        fill
        className="object-cover"
        sizes="150px"
        priority={index === 0}
        unoptimized={img.url.startsWith("/api/media")}
      />
      {!uploadsLocked && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute end-1 top-1 size-6"
          onClick={() => onRemove(index)}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

function PendingImageItem({ item, t, onRemove }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
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
          onClick={() => onRemove(item.id)}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

function UploadPlaceholder({ accept, onFilesSelect, t }) {
  return (
    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors hover:bg-muted/50">
      <Upload className="size-6 text-muted-foreground" />
      <span className="px-2 text-center text-xs text-muted-foreground">{t("addPhotos")}</span>
      <span className="px-2 text-center text-[10px] text-muted-foreground">{t("formatsHint")}</span>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          onFilesSelect(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Custom hook managing state, upload progression, error trapping and capacity. */
function useImageUpload({ images, onChange, onGpsFound, onBlockedChange, t }) {
  const [pending, setPending] = useState([]);
  const [blocked, setBlocked] = useState(null);
  const { track: trackPreview, release: releasePreview } = useObjectURLs();
  const imagesRef = useRef(images);
  const pendingRef = useRef(pending);
  const blockedRef = useRef(blocked);

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => { blockedRef.current = blocked; }, [blocked]);

  function applyBlockingError(code) {
    if (blockedRef.current) return;
    const message = resolveErrorMessage(code, t);
    const next = { code, message };
    blockedRef.current = next;
    setBlocked(next);
    onBlockedChange?.(true, next);
    setPending((items) => {
      items.forEach((item) => releasePreview(item.preview));
      return [];
    });
  }

  async function uploadOne(upload) {
    if (blockedRef.current) return;
    try {
      const uploaded = await uploadImageFile(upload.file, {
        onProgress: (progress) => {
          setPending((items) => items.map((item) => (item.id === upload.id ? { ...item, progress, error: null } : item)));
        },
      });

      setPending((items) => {
        const target = items.find((item) => item.id === upload.id);
        releasePreview(target?.preview);
        return items.filter((item) => item.id !== upload.id);
      });
      onChange([...imagesRef.current, uploaded]);
    } catch (err) {
      console.error(err);
      const code = err.code || "";
      if (BLOCKING_ERROR_CODES.has(code)) {
        applyBlockingError(code);
        return;
      }
      setPending((items) => items.map((item) => (item.id === upload.id ? { ...item, error: resolveErrorMessage(code, t), progress: 0 } : item)));
    }
  }

  function handleFiles(fileList) {
    if (!fileList?.length || blockedRef.current) return;

    const slotsUsed = imagesRef.current.length + pendingRef.current.length;
    const validFiles = filterValidFiles(fileList, slotsUsed);

    if (onGpsFound) {
      validFiles.forEach((file) => {
        extractGpsFromImageFile(file).then((gps) => { if (gps) onGpsFound(gps); });
      });
    }

    const uploads = validFiles.map((file) => createUploadItem(file, trackPreview));
    if (!uploads.length) return;

    setPending((items) => {
      const next = [...items, ...uploads];
      pendingRef.current = next;
      return next;
    });

    void Promise.allSettled(uploads.map((upload) => uploadOne(upload)));
  }

  function removePending(id) {
    setPending((items) => {
      const target = items.find((item) => item.id === id);
      releasePreview(target?.preview);
      return items.filter((item) => item.id !== id);
    });
  }

  const removeImage = (index) => {
    if (!blocked) onChange(images.filter((_, i) => i !== index));
  };

  const isUploading = pending.some((item) => !item.error);
  const slotsUsed = images.length + pending.length;
  const atCapacity = slotsUsed >= MAX_LISTING_IMAGES;
  const uploadsLocked = Boolean(blocked);

  return {
    pending,
    blocked,
    isUploading,
    atCapacity,
    uploadsLocked,
    handleFiles,
    removeImage,
    removePending,
  };
}

export function ImageUploader({ images, onChange, hint, onGpsFound, onBlockedChange }) {
  const t = useTranslations("upload");
  const {
    pending,
    blocked,
    isUploading,
    atCapacity,
    uploadsLocked,
    handleFiles,
    removeImage,
    removePending,
  } = useImageUpload({ images, onChange, onGpsFound, onBlockedChange, t });

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
          <UploadedImageItem
            key={img.s3Key || img.url}
            img={img}
            index={i}
            uploadsLocked={uploadsLocked}
            onRemove={removeImage}
          />
        ))}

        {pending.map((item) => (
          <PendingImageItem
            key={item.id}
            item={item}
            t={t}
            onRemove={removePending}
          />
        ))}

        {!atCapacity && !uploadsLocked && (
          <UploadPlaceholder
            accept={ALLOWED_IMAGE_ACCEPT}
            onFilesSelect={handleFiles}
            t={t}
          />
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
