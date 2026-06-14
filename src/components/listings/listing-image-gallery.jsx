"use client";

import Image from "next/image";
import { Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageLightbox, ImageLightboxDialog } from "@/components/shared/image-lightbox";

/**
 * Grid of listing photos with a full-screen lightbox and prev/next navigation.
 */
export function ListingImageGallery({ images, altPrefix = "" }) {
  const sorted = [...(images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const lightboxImages = sorted.map((img, i) => ({
    url: img.url,
    alt: altPrefix ? `${altPrefix} ${i + 1}` : "",
  }));

  const lightbox = useImageLightbox(lightboxImages);

  if (!sorted.length) return null;

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          sorted.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"
        )}
      >
        {sorted.map((img, i) => (
          <button
            key={img.id ?? i}
            type="button"
            onClick={() => lightbox.open(i)}
            className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src={img.url}
              alt={lightboxImages[i]?.alt || ""}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={i === 0}
              unoptimized={img.url.startsWith("/api/media")}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
              <Expand className="size-6 text-white drop-shadow-md" aria-hidden />
            </span>
          </button>
        ))}
      </div>

      <ImageLightboxDialog
        lightbox={lightbox}
        title={altPrefix}
        counterLabel={
          sorted.length > 1
            ? `${(lightbox.index ?? 0) + 1} / ${sorted.length}`
            : undefined
        }
      />
    </>
  );
}
