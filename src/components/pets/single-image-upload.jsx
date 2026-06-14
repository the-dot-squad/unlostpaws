"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { uploadImageFile, ALLOWED_IMAGE_ACCEPT } from "@/lib/storage/upload-client";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";
import { UploadProgressOverlay } from "@/components/shared/upload-progress";

export function SingleImageUpload({
  image,
  onChange,
  label,
  optional = false,
  required = false,
  hideLabel = false,
  slotClassName = "aspect-square w-32",
}) {
  const t = useTranslations("upload");
  const tCommon = useTranslations("common");
  const [pending, setPending] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  async function handleFile(file) {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      const id = crypto.randomUUID();
      setPending({ id, preview: null, progress: 0, error: t("invalidExtension") });
      return;
    }

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    const id = crypto.randomUUID();

    setPending({ id, preview, progress: 0, error: null });

    try {
      const uploaded = await uploadImageFile(file, {
        prefix: "pets",
        onProgress: (progress) => {
          setPending((current) =>
            current?.id === id ? { ...current, progress, error: null } : current
          );
        },
      });

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
      setPending(null);
      onChange(uploaded);
    } catch (err) {
      console.error(err);
      const message =
        err.code === "invalid_image_extension"
          ? t("invalidExtension")
          : err.code === "invalid_image_type"
            ? t("invalidType")
            : t("failed");
      setPending((current) =>
        current?.id === id ? { ...current, error: message, progress: 0 } : current
      );
    }
  }

  function clearPending() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPending(null);
  }

  const isUploading = Boolean(pending && !pending.error);

  const slotClasses = `relative overflow-hidden rounded-xl border bg-muted shadow-sm ${slotClassName}`;

  return (
    <div className="space-y-2">
      {!hideLabel ? (
        <p className="text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="ms-0.5 text-destructive">*</span>}
          {optional && <span className="ms-1 font-normal">({tCommon("optional")})</span>}
        </p>
      ) : null}

      {pending ? (
        pending.preview ? (
        <div className={slotClasses}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending.preview} alt="" className="size-full object-cover" />
          <UploadProgressOverlay
            progress={pending.progress}
            label={t("percent", { percent: pending.progress })}
            error={pending.error}
          />
          {pending.error && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute end-1 top-1 size-6"
              onClick={clearPending}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
        ) : (
          <p className="text-xs text-destructive">{pending.error}</p>
        )
      ) : image?.url ? (
        <div className={slotClasses}>
          <Image
            src={image.url}
            alt=""
            fill
            className="object-cover"
            sizes="128px"
            unoptimized={image.url.startsWith("/api/media")}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute end-1 top-1 size-6"
            onClick={() => onChange(null)}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground/30 bg-background/50 transition-colors ${slotClassName} ${
            isUploading ? "pointer-events-none opacity-60" : "hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <span className="px-2 text-center text-xs text-muted-foreground">{t("addPhotos")}</span>
          <input
            type="file"
            accept={ALLOWED_IMAGE_ACCEPT}
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {isUploading && <p className="text-xs text-muted-foreground">{t("uploading")}</p>}
    </div>
  );
}
