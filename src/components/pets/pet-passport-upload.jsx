"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileImage, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImageFile, ALLOWED_IMAGE_ACCEPT } from "@/lib/storage/upload-client";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";
import { cn } from "@/lib/utils";

/**
 * Compact passport upload — no image preview, just upload / status / remove.
 */
export function PetPassportUpload({ passportPhoto, onChange, className }) {
  const t = useTranslations("myPets");
  const tCommon = useTranslations("common");
  const tUpload = useTranslations("upload");
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);

  async function handleFile(file) {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      const id = crypto.randomUUID();
      setPending({ id, progress: 0, error: tUpload("invalidExtension"), name: file.name });
      return;
    }

    const id = crypto.randomUUID();
    setPending({ id, progress: 0, error: null, name: file.name });

    try {
      const uploaded = await uploadImageFile(file, {
        prefix: "pets",
        onProgress: (progress) => {
          setPending((current) =>
            current?.id === id ? { ...current, progress, error: null } : current
          );
        },
      });
      setPending(null);
      onChange(uploaded);
    } catch (err) {
      console.error(err);
      const message =
        err.code === "invalid_image_extension"
          ? tUpload("invalidExtension")
          : err.code === "invalid_image_type"
            ? tUpload("invalidType")
            : tUpload("failed");
      setPending((current) =>
        current?.id === id ? { ...current, error: message, progress: 0 } : current
      );
    }
  }

  const isUploading = Boolean(pending && !pending.error);
  const hasFile = Boolean(passportPhoto?.url);

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-muted-foreground/25 bg-muted/15 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileImage className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{t("passportSectionTitle")}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {tCommon("optional")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t("passportSectionSubtitle")}</p>
        </div>
      </div>

      <div className="mt-3">
        <input
          ref={inputRef}
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

        {pending ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5",
              pending.error && "border-destructive/40"
            )}
          >
            {pending.error ? (
              <X className="size-4 shrink-0 text-destructive" aria-hidden />
            ) : (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {pending.error ? pending.error : tUpload("uploading")}
              </p>
              {!pending.error && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pending.progress}%` }}
                  />
                </div>
              )}
            </div>
            {pending.error && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
                {tCommon("close")}
              </Button>
            )}
          </div>
        ) : hasFile ? (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1 text-sm font-medium">{t("passportUploaded")}</p>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => inputRef.current?.click()}
              >
                {t("passportReplace")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(null)}
                aria-label={t("passportRemove")}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-background px-3 py-3 text-start transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Upload className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("passportUploadAction")}</p>
              <p className="text-xs text-muted-foreground">{t("passportPhotoHint")}</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
