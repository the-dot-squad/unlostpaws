"use client";

import Image from "next/image";
import { Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageLightbox, ImageLightboxDialog } from "@/components/shared/image-lightbox";

/**
 * Listing photos — static preview on the page (1 on mobile, 2 on desktop),
 * dots for total count. Click opens the lightbox carousel.
 */
export function ListingImageGallery({ images, altPrefix = "" }) {
  const sorted = [...(images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const lightboxImages = sorted.map((img, i) => ({
    url: img.url,
    alt: altPrefix ? `${altPrefix} ${i + 1}` : "",
  }));

  const lightbox = useImageLightbox(lightboxImages);
  const hasMultiple = sorted.length > 1;

  if (!sorted.length) return null;

  function PhotoButton({ img, i, className }) {
    return (
      <button
        type="button"
        onClick={() => lightbox.open(i)}
        className={cn(
          "group relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <Image
          src={img.url}
          alt={lightboxImages[i]?.alt || ""}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 50vw"
          preload={i === 0}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          unoptimized={img.url.startsWith("/api/media")}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
          <Expand className="size-6 text-white drop-shadow-md" aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="sm:hidden">
        <PhotoButton img={sorted[0]} i={0} />
      </div>

      <div className={cn("hidden gap-3 sm:grid", sorted.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {sorted.slice(0, 2).map((img, i) => (
          <PhotoButton key={img.id ?? i} img={img} i={i} />
        ))}
      </div>

      {hasMultiple && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
          {sorted.map((_, i) => (
            <span key={i} className="size-2 rounded-full bg-muted-foreground/30" />
          ))}
        </div>
      )}

      <ImageLightboxDialog
        lightbox={lightbox}
        title={altPrefix}
        counterLabel={
          hasMultiple ? `${(lightbox.index ?? 0) + 1} / ${sorted.length}` : undefined
        }
      />
    </>
  );
}
