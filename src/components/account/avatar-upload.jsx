"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Camera, ExternalLink, Loader2 } from "lucide-react";
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
 *
 * @param {object} props
 * @param {string} [props.name]
 * @param {string} [props.imageUrl]
 * @param {(url: string) => void} props.onChange
 * @param {boolean} [props.verified]
 * @param {string} [props.profileHref] Locale-prefixed public profile URL.
 * @param {string} [props.profileHandle] Display handle, e.g. @username.
 */
export function AvatarUpload({
  name,
  imageUrl,
  onChange,
  verified = false,
  profileHref,
  profileHandle,
}) {
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0 self-start">
        <Avatar
          className={cn(
            "size-20",
            uploading && "opacity-60",
            verified && "ring-2 ring-blue-500/50 ring-offset-2 ring-offset-background"
          )}
        >
          <AvatarImage src={imageUrl || undefined} alt={name || ""} />
          <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
        </Avatar>
        {profileHref ? (
          <Link
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            title={t("profile.viewPublicProfile")}
            aria-label={t("profile.viewPublicProfile")}
            className="absolute -bottom-0.5 -end-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-accent hover:text-primary"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : null}
      </div>

      <div className="min-w-0 space-y-2">
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
        {profileHref && profileHandle ? (
          <Link
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-[11px] leading-snug text-primary hover:underline"
          >
            <span className="truncate">{t("profile.viewPublicProfile")}</span>
            <span className="shrink-0 font-mono text-muted-foreground">{profileHandle}</span>
            <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden="true" />
          </Link>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
