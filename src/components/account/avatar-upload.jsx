"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import { uploadImageFile, ALLOWED_IMAGE_ACCEPT } from "@/lib/storage/upload-client";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Circular avatar picker with S3 upload support.
 */
export function AvatarUpload({ name, imageUrl, onChange }) {
  const t = useTranslations("account");
  const tUpload = useTranslations("upload");
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      setError(tUpload("invalidExtension"));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadImageFile(file, { prefix: "avatars" });
      onChange(uploaded.url);
    } catch (err) {
      console.error(err);
      setError(
        err.code === "invalid_image_extension"
          ? tUpload("invalidExtension")
          : err.code === "invalid_image_type"
            ? tUpload("invalidType")
            : tUpload("failed")
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className={cn("size-20", uploading && "opacity-60")}>
          <AvatarImage src={imageUrl || undefined} alt={name || ""} />
          <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
          {uploading ? t("avatarUploading") : t("changeAvatar")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
