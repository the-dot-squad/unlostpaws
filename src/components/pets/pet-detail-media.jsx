"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Expand, FileImage, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageLightbox, ImageLightboxDialog } from "@/components/shared/image-lightbox";

/**
 * @typedef {{ url: string } | null} PetMediaImage
 * @typedef {{ photo: PetMediaImage, photo2: PetMediaImage, passportPhoto: PetMediaImage }} PetMedia
 */

function CompactPhotoThumb({ src, alt, label, emptyLabel, onClick }) {
  const clickable = Boolean(src && onClick);

  const thumb = (
    <div
      className={cn(
        "group relative size-[4.5rem] overflow-hidden rounded-lg bg-muted ring-1 ring-border/70 sm:size-24",
        clickable && "transition-shadow hover:ring-primary/40 hover:shadow-sm"
      )}
    >
      {src ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="96px"
            unoptimized={src.startsWith("/api/media")}
          />
          {clickable && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
              <Expand className="size-4 text-white drop-shadow-md" aria-hidden />
            </span>
          )}
        </>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <PawPrint className="size-5 opacity-40" aria-hidden />
          <span className="px-1 text-center text-[9px] leading-tight">{emptyLabel}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      {clickable ? (
        <button
          type="button"
          onClick={onClick}
          className="cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={label}
        >
          {thumb}
        </button>
      ) : (
        thumb
      )}
      <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-muted-foreground sm:max-w-24">
        {label}
      </span>
    </div>
  );
}

/**
 * Compact pet photo strip — click to open lightbox.
 *
 * @param {PetMedia} media
 */
export function PetDetailPhotos({ media, petName }) {
  const t = useTranslations("myPets");

  const petImages = [
    media.photo?.url ? { url: media.photo.url, alt: petName } : null,
    media.photo2?.url ? { url: media.photo2.url, alt: petName } : null,
  ].filter(Boolean);

  const petLightbox = useImageLightbox(petImages);

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("petPhotosTitle")}
        </p>
        <div className="flex flex-row gap-3 sm:flex-col">
          <CompactPhotoThumb
            src={media.photo?.url}
            alt={petName}
            label={t("photoPrimary")}
            emptyLabel={t("noPhoto")}
            onClick={media.photo?.url ? () => petLightbox.open(0) : undefined}
          />
          {media.photo2?.url ? (
            <CompactPhotoThumb
              src={media.photo2.url}
              alt={petName}
              label={t("photoSecondary")}
              emptyLabel={t("noPhoto")}
              onClick={() => petLightbox.open(1)}
            />
          ) : null}
        </div>
      </div>

      <ImageLightboxDialog
        lightbox={petLightbox}
        title={petName}
        counterLabel={
          petImages.length > 1
            ? t("photoCounter", { current: (petLightbox.index ?? 0) + 1, total: petImages.length })
            : undefined
        }
      />
    </>
  );
}

/**
 * Passport document link — placed after details, opens lightbox on click.
 *
 * @param {PetMedia} media
 */
export function PetPassportLink({ media }) {
  const t = useTranslations("myPets");
  const passportUrl = media.passportPhoto?.url;
  const passportImages = passportUrl
    ? [{ url: passportUrl, alt: t("passportSectionTitle") }]
    : [];
  const passportLightbox = useImageLightbox(passportImages);

  if (!passportUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => passportLightbox.open(0)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/15 px-4 py-3 text-start transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileImage className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("passportSectionTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("viewPassport")}</p>
        </div>
        <Expand className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <ImageLightboxDialog lightbox={passportLightbox} title={t("passportSectionTitle")} />
    </>
  );
}
