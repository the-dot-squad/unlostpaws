"use client";

import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_PET_PHOTOS } from "@/config/constants/enums";
import { SingleImageUpload } from "./single-image-upload";

/**
 * Pet photo slots for the form sidebar — up to 2 pet photos with previews.
 */
export function PetPhotosUpload({ photo, photo2, onPhotoChange, onPhoto2Change, className }) {
  const t = useTranslations("myPets");
  const petPhotoCount = (photo ? 1 : 0) + (photo2 ? 1 : 0);

  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Camera className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{t("petPhotosTitle")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t("petPhotosSubtitle")}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {petPhotoCount}/{MAX_PET_PHOTOS}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SingleImageUpload
          image={photo}
          onChange={onPhotoChange}
          label={t("photoPrimary")}
          slotClassName="aspect-square w-full"
          required
        />
        <SingleImageUpload
          image={photo2}
          onChange={onPhoto2Change}
          label={t("photoSecondary")}
          slotClassName="aspect-square w-full"
          optional
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("petPhotosHint")}</p>
    </section>
  );
}
