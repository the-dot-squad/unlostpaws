import Link from "next/link";
import Image from "next/image";
import { PawPrint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProcessingStatusBadge } from "@/components/listings/processing-status-badge";
import { PetTypeIcon } from "@/components/pets/pet-type-icon";
import { ownedPetPath } from "@/lib/paths";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function PhotoThumb({ src, alt, className }) {
  return (
    <div className={cn("relative min-h-0 overflow-hidden bg-muted", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 200px"
          unoptimized={src.startsWith("/api/media")}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground/50">
          <PawPrint className="size-6" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function PetCard({ pet, locale, petTypeLabel, statusLabel, processingLabel }) {
  const showProcessing = pet.processingStatus && pet.processingStatus !== "ready" && processingLabel;
  const hasSecondPhoto = Boolean(pet.photo2?.url);

  return (
    <Link href={ownedPetPath(pet.publicId, locale)} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all hover:border-primary/30 hover:shadow-md">
        <div
          className={cn(
            "relative bg-muted",
            hasSecondPhoto ? "flex aspect-[5/3] divide-x divide-border/60" : "aspect-[4/3]"
          )}
        >
          <PhotoThumb
            src={pet.photo?.url}
            alt={pet.name}
            className={hasSecondPhoto ? "flex-1" : "absolute inset-0"}
          />
          {hasSecondPhoto ? <PhotoThumb src={pet.photo2.url} alt="" className="flex-1" /> : null}
          {showProcessing && (
            <div className="absolute start-2 top-2 z-10">
              <ProcessingStatusBadge status={pet.processingStatus} label={processingLabel} />
            </div>
          )}
        </div>

        <CardContent className="space-y-2.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold leading-tight">{pet.name}</p>
            {pet.status !== "active" && statusLabel && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {statusLabel}
              </Badge>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <PetTypeIcon type={pet.petType} className="size-3.5 text-primary" />
            <span className="truncate">{petTypeLabel}</span>
            {pet.color ? (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span className="truncate">{pet.color}</span>
              </>
            ) : null}
          </p>

          <p className="truncate font-mono text-[11px] tracking-wide text-muted-foreground">
            {pet.microchipId}
          </p>

          {pet.createdAt ? (
            <p className="text-[11px] text-muted-foreground/80">
              {formatDate(pet.createdAt, locale)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
