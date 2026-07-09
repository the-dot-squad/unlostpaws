"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ImageCarousel } from "@/components/shared/image-carousel";

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
  const goTo = useCallback(
    (i) => {
      setIndex((current) => {
        if (current === null) return current;
        return Math.max(0, Math.min(i, images.length - 1));
      });
    },
    [images.length]
  );
  const showPrev = useCallback(() => {
    setIndex((i) => (i === null ? null : i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);
  const showNext = useCallback(() => {
    setIndex((i) => (i === null ? null : i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  return { images, index, open, close, goTo, showPrev, showNext };
}

/**
 * Full-screen lightbox carousel (swipe, chevrons, dots).
 *
 * @param {ReturnType<typeof useImageLightbox>} lightbox
 * @param {string} [title]
 * @param {string} [counterLabel] e.g. "Photo 1 of 2"
 */
export function ImageLightboxDialog({ lightbox, title = "", counterLabel }) {
  const { images, index, close, goTo, showPrev, showNext } = lightbox;
  const isOpen = index !== null;
  const current = isOpen ? images[index] : null;
  const hasMultiple = images.length > 1;
  const positionLabel =
    counterLabel || (isOpen && hasMultiple ? `${index + 1} / ${images.length}` : "");

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e) {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, showPrev, showNext]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        closeClassName={LIGHTBOX_CLOSE_CLASS}
        className="max-w-5xl gap-0 overflow-hidden border-none bg-black p-0 sm:rounded-xl"
      >
        <DialogTitle className="sr-only">{title || current?.alt || "Image"}</DialogTitle>
        <DialogDescription className="sr-only">
          {positionLabel || "Image viewer"}
        </DialogDescription>

        {isOpen && (
          <div className="relative flex min-h-[50vh] flex-col">
            <div className="relative z-50 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black px-4 py-3 pe-14">
              <p className="min-w-0 truncate text-sm font-medium text-white">
                {title || current?.alt || ""}
              </p>
              {positionLabel ? (
                <p className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/90">
                  {positionLabel}
                </p>
              ) : null}
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col bg-black">
              <ImageCarousel
                images={images}
                index={index}
                onIndexChange={goTo}
                className="w-full"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
