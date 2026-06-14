"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Close button styling for dark fullscreen image viewers. */
export const LIGHTBOX_CLOSE_CLASS =
  "end-3 top-3 z-[60] flex size-10 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white opacity-100 shadow-lg backdrop-blur-sm transition-colors hover:bg-white/20 hover:opacity-100 focus:ring-white/40";

/**
 * @typedef {{ url: string, alt?: string }} LightboxImage
 */

/**
 * @param {LightboxImage[]} images
 */
export function useImageLightbox(images) {
  const [index, setIndex] = useState(null);

  const close = useCallback(() => setIndex(null), []);
  const open = useCallback((i) => setIndex(i), []);
  const showPrev = useCallback(() => {
    setIndex((i) => (i === null ? null : i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);
  const showNext = useCallback(() => {
    setIndex((i) => (i === null ? null : i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  return { images, index, open, close, showPrev, showNext };
}

/**
 * Full-screen image viewer with optional prev/next when multiple images.
 * Shared by pet detail and listing alert galleries.
 *
 * @param {ReturnType<typeof useImageLightbox>} lightbox
 * @param {string} [title]
 * @param {string} [counterLabel] e.g. "Photo 1 of 2"
 */
export function ImageLightboxDialog({ lightbox, title = "", counterLabel }) {
  const { images, index, close, showPrev, showNext } = lightbox;
  const current = index !== null ? images[index] : null;
  const hasMultiple = images.length > 1;
  const positionLabel =
    counterLabel || (index !== null && hasMultiple ? `${index + 1} / ${images.length}` : "");

  useEffect(() => {
    if (index === null) return;

    function onKeyDown(e) {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, showPrev, showNext]);

  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        closeClassName={LIGHTBOX_CLOSE_CLASS}
        className="max-w-5xl gap-0 overflow-hidden border-none bg-black/95 p-0 sm:rounded-xl"
      >
        <DialogTitle className="sr-only">{title || current?.alt || "Image"}</DialogTitle>
        <DialogDescription className="sr-only">
          {positionLabel || "Image viewer"}
        </DialogDescription>

        {current && (
          <div className="relative flex min-h-[50vh] flex-col">
            {/* Top bar — title, counter, visible close (DialogContent also renders X) */}
            <div className="relative z-50 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/50 px-4 py-3 pe-14 backdrop-blur-sm">
              <p className="min-w-0 truncate text-sm font-medium text-white">
                {title || current.alt || ""}
              </p>
              {positionLabel ? (
                <p className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/90">
                  {positionLabel}
                </p>
              ) : null}
            </div>

            <div className="relative flex flex-1 items-center justify-center p-4">
              <div className="relative h-[min(70vh,calc(100dvh-8rem))] w-full max-w-4xl">
                <Image
                  src={current.url}
                  alt={current.alt || ""}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized={current.url.startsWith("/api/media")}
                />
              </div>

              {hasMultiple && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "absolute start-2 top-1/2 z-50 size-10 -translate-y-1/2 rounded-full",
                      "border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-sm",
                      "hover:bg-white/20 hover:text-white"
                    )}
                    onClick={showPrev}
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "absolute end-2 top-1/2 z-50 size-10 -translate-y-1/2 rounded-full",
                      "border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-sm",
                      "hover:bg-white/20 hover:text-white"
                    )}
                    onClick={showNext}
                    aria-label="Next"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
