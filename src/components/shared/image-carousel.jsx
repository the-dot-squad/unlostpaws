"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @typedef {{ url: string, alt?: string, id?: string | number }} CarouselImage
 */

/**
 * Fullscreen lightbox carousel — swipe, chevrons, and dots.
 */
export function ImageCarousel({ images, index, onIndexChange, className }) {
  const scrollRef = useRef(null);
  const [slideSpan, setSlideSpan] = useState(0);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || images.length === 0) return;

    function measure() {
      const first = el.children[0];
      if (!first) return;
      const gap = Number.parseFloat(getComputedStyle(el).gap) || 0;
      setSlideSpan(first.getBoundingClientRect().width + gap);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, [images.length]);

  const scrollToIndex = useCallback(
    (i) => {
      const el = scrollRef.current;
      if (!el || !slideSpan) return;
      const clamped = Math.max(0, Math.min(i, images.length - 1));
      el.scrollTo({ left: clamped * slideSpan, behavior: "smooth" });
      onIndexChange(clamped);
    },
    [images.length, onIndexChange, slideSpan]
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !slideSpan) return;
    const next = Math.round(el.scrollLeft / slideSpan);
    const clamped = Math.max(0, Math.min(next, images.length - 1));
    if (clamped !== index) onIndexChange(clamped);
  }, [images.length, index, onIndexChange, slideSpan]);

  useEffect(() => {
    if (!slideSpan || !scrollRef.current) return;
    const el = scrollRef.current;
    const target = index * slideSpan;
    if (Math.abs(el.scrollLeft - target) > 2) {
      el.scrollTo({ left: target, behavior: "auto" });
    }
  }, [index, slideSpan]);

  const showPrev = useCallback(() => {
    scrollToIndex(index > 0 ? index - 1 : images.length - 1);
  }, [images.length, index, scrollToIndex]);

  const showNext = useCallback(() => {
    scrollToIndex(index < images.length - 1 ? index + 1 : 0);
  }, [images.length, index, scrollToIndex]);

  if (!images.length) return null;

  // Dialog is max-w-5xl; chevron columns are w-11 (sm:w-12) each when hasMultiple.
  const imageSizes = hasMultiple
    ? "(max-width: 640px) calc(100vw - 5.5rem), min(928px, calc(100vw - 6rem))"
    : "(max-width: 640px) 100vw, 1024px";

  const navButtonClassName = cn(
    "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
    "border border-white/25 bg-white/10 text-white shadow-lg transition-colors",
    "hover:bg-white/20 hover:text-white",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
  );

  return (
    // Image order is sequential, not reading-directional — keep LTR so scrollLeft
    // math and prev/next placement stay correct inside RTL pages (e.g. fa).
    <div dir="ltr" className={cn("relative bg-black", className)}>
      <div className="flex items-center bg-black">
        {hasMultiple && (
          <div className="flex w-11 shrink-0 items-center justify-center bg-black sm:w-12">
            <button type="button" className={navButtonClassName} onClick={showPrev} aria-label="Previous photo">
              <ChevronLeft className="size-5" />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth touch-pan-x bg-black [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <div key={img.id ?? i} className="w-full shrink-0 snap-start">
              <div className="relative h-[min(70vh,calc(100dvh-8rem))] w-full">
                <Image
                  src={img.url}
                  alt={img.alt || ""}
                  fill
                  className="object-contain"
                  sizes={imageSizes}
                  preload={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  unoptimized={img.url.startsWith("/api/media")}
                />
              </div>
            </div>
          ))}
        </div>

        {hasMultiple && (
          <div className="flex w-11 shrink-0 items-center justify-center bg-black sm:w-12">
            <button type="button" className={navButtonClassName} onClick={showNext} aria-label="Next photo">
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>

      {hasMultiple && (
        <div className="flex items-center justify-center gap-1.5 bg-black py-3">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "size-2 rounded-full transition-colors",
                i === index ? "bg-white" : "bg-white/35"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
