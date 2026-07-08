import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  CalendarClock,
  Fingerprint,
  Palette,
  PawPrint,
  Pencil,
  Tag,
  Text,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProcessingStatusBadge } from "@/components/listings/processing-status-badge";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { ArchivePetButton } from "@/components/pets/archive-pet-button";
import { RestorePetButton } from "@/components/pets/restore-pet-button";
import { DeletePetButton } from "@/components/pets/delete-pet-button";
import { PetDetailPhotos, PetPassportLink } from "@/components/pets/pet-detail-media";
import { serializeOwnedPetMedia } from "@/models/owned-pet";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Minimum gap between created and updated before showing both timestamps. */
const UPDATED_THRESHOLD_MS = 60_000;

function DetailField({ icon: Icon, label, children, className }) {
  return (
    <div className={cn("rounded-lg border bg-muted/20 px-4 py-3", className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </p>
      <div className="mt-1.5 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function TimestampRow({ label, iso, formatted }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium text-foreground">{label}:</span>{" "}
        <time dateTime={iso} suppressHydrationWarning>
          {formatted}
        </time>
      </span>
    </p>
  );
}

/**
 * Read-only pet profile for the account dashboard.
 */
export async function PetDetailView({ pet, locale, petTypeLabel, processingLabel }) {
  const t = await getTranslations("myPets");
  const media = serializeOwnedPetMedia(pet);

  const createdIso = new Date(pet.createdAt).toISOString();
  const updatedIso = pet.updatedAt ? new Date(pet.updatedAt).toISOString() : null;
  const showUpdated =
    pet.updatedAt &&
    new Date(pet.updatedAt).getTime() - new Date(pet.createdAt).getTime() > UPDATED_THRESHOLD_MS;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${locale}/account/pets`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t("backToPets")}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {pet.status !== "active" && (
                <Badge variant="secondary">{t(`status.${pet.status}`)}</Badge>
              )}
              <ProcessingStatusBadge
                status={pet.processingStatus}
                label={processingLabel}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pet.status !== "archived" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/account/pets/${pet.publicId}?edit=1`}>
                <Pencil className="size-3.5" />
                {t("editPet")}
              </Link>
            </Button>
          )}
          {pet.status === "active" && (
            <ArchivePetButton petId={pet.publicId} locale={locale} />
          )}
          {pet.status === "archived" && (
            <>
              <RestorePetButton petId={pet.publicId} />
              <DeletePetButton petId={pet.publicId} locale={locale} />
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Compact photos — fixed narrow column */}
            <div className="shrink-0 sm:w-[7.5rem]">
              <PetDetailPhotos media={media} petName={pet.name} />
            </div>

            {/* Details — fills remaining space */}
            <div className="min-w-0 flex-1 space-y-5">
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("details")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField icon={Fingerprint} label={t("microchipId")}>
                    <span className="font-mono text-[13px] tracking-wide">{pet.microchipId}</span>
                  </DetailField>
                  <DetailField icon={Tag} label={t("petType")}>
                    <span className="inline-flex items-center gap-2 capitalize">
                      <PetTypeIcon type={pet.petType} className="size-4 text-primary" />
                      {petTypeLabel}
                    </span>
                  </DetailField>
                  <DetailField icon={Palette} label={t("color")}>
                    {pet.color}
                  </DetailField>
                  {pet.breed ? (
                    <DetailField icon={PawPrint} label={t("breed")}>
                      {pet.breed}
                    </DetailField>
                  ) : null}
                </div>
              </div>

              {pet.description ? (
                <DetailField icon={Text} label={t("description")}>
                  <p className="font-normal leading-relaxed text-muted-foreground">{pet.description}</p>
                </DetailField>
              ) : null}

              <Separator />

              <div className="space-y-2">
                <TimestampRow
                  label={t("createdAt")}
                  iso={createdIso}
                  formatted={formatDateTime(pet.createdAt, locale)}
                />
                {showUpdated ? (
                  <TimestampRow
                    label={t("updatedAt")}
                    iso={updatedIso}
                    formatted={formatDateTime(pet.updatedAt, locale)}
                  />
                ) : null}
              </div>

              {media.passportPhoto?.url ? (
                <>
                  <Separator />
                  <PetPassportLink media={media} />
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
