import Image from "next/image";
import { AlertTriangle, Fingerprint, Palette, PawPrint, Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { TagContactButton } from "@/components/tag/tag-contact-button";
import { cn } from "@/lib/utils";

/**
 * Mobile-first public emergency passport for an eligible Digital Collar.
 */
export async function TagEmergencyView({ pet, petTypeLabel, locale }) {
  const t = await getTranslations("tag");
  const photoUrl = pet.photo?.url;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 sm:py-10">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{pet.name}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative aspect-square w-full bg-muted">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={pet.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              unoptimized={photoUrl.startsWith("/api/media")}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <PawPrint className="size-12 opacity-40" aria-hidden />
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetaChip icon={Tag} label={t("petType")}>
              <span className="inline-flex items-center gap-1.5 capitalize">
                <PetTypeIcon type={pet.petType} className="size-4 text-primary" />
                {petTypeLabel}
              </span>
            </MetaChip>
            <MetaChip icon={Palette} label={t("color")}>
              {pet.color}
            </MetaChip>
            {pet.breed ? (
              <MetaChip icon={PawPrint} label={t("breed")}>
                {pet.breed}
              </MetaChip>
            ) : null}
            <MetaChip
              icon={Fingerprint}
              label={t("microchip")}
              className={pet.breed ? undefined : "sm:col-span-2"}
            >
              {pet.hasMicrochip ? t("microchipYes") : t("microchipNo")}
            </MetaChip>
          </div>

          {pet.medicalAlerts ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                {t("medicalAlerts")}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {pet.medicalAlerts}
              </p>
            </div>
          ) : null}

          <TagContactButton publicId={pet.publicId} />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground" dir={locale === "fa" ? "rtl" : "ltr"}>
        {t("footerNote")}
      </p>
    </div>
  );
}

/**
 * Soft page when the collar exists but Premium expired / disabled / archived.
 */
export async function TagInactiveView({ pet, locale }) {
  const t = await getTranslations("tag");
  const photoUrl = pet.photo?.url;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 sm:py-10">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{pet.name}</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {photoUrl ? (
          <div className="relative aspect-square w-full bg-muted">
            <Image
              src={photoUrl}
              alt={pet.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              unoptimized={photoUrl.startsWith("/api/media")}
            />
          </div>
        ) : null}
        <div className="space-y-2 p-5 text-center">
          <p className="font-medium">{t("inactiveTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("inactiveBody")}</p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground" dir={locale === "fa" ? "rtl" : "ltr"}>
        {t("footerNote")}
      </p>
    </div>
  );
}

function MetaChip({ icon: Icon, label, children, className }) {
  return (
    <div className={cn("rounded-lg border bg-muted/20 px-3 py-2.5", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}
