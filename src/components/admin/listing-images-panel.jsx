"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/** File extension from s3Key or URL path. */
function extensionFromImage(img) {
  const src = img.s3Key || img.url || "";
  const match = src.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Fetch size and MIME type via HEAD when available. */
async function fetchImageMeta(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || null;
    return {
      bytes: len ? Number(len) : null,
      contentType,
    };
  } catch {
    return null;
  }
}

/** Build subtitle: dimensions · size · extension · mime */
function formatImageSubtitle(info, ext) {
  const parts = [];
  if (info?.width) parts.push(`${info.width}×${info.height}`);
  if (info?.bytes) parts.push(formatBytes(info.bytes));
  if (ext) parts.push(`.${ext}`);
  if (info?.contentType) parts.push(info.contentType);
  return parts.length ? parts.join(" · ") : "…";
}

/** Single thumbnail — owns its own metadata so parent never loops on setState. */
function ImageThumbnail({ img, label, onOpen }) {
  const [info, setInfo] = useState(() => ({
    width: null,
    height: null,
    bytes: img.bytes || null,
    contentType: img.contentType || null,
  }));
  const url = img.url;
  const ext = extensionFromImage(img);

  useEffect(() => {
    if (!url) return;
    
    // Skip client-side HEAD fetch if metadata is already present in DB
    if (img.bytes && img.contentType) {
      return;
    }

    let cancelled = false;
    fetchImageMeta(url).then((remote) => {
      if (cancelled || !remote) return;
      setInfo((prev) => {
        const next = {
          width: prev?.width,
          height: prev?.height,
          bytes: remote.bytes ?? prev?.bytes,
          contentType: remote.contentType ?? prev?.contentType,
        };
        if (
          prev?.bytes === next.bytes &&
          prev?.contentType === next.contentType &&
          prev?.width === next.width &&
          prev?.height === next.height
        ) {
          return prev;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [url, img.bytes, img.contentType]);

  function handleLoad(e) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setInfo((prev) => {
      if (prev?.width === naturalWidth && prev?.height === naturalHeight) return prev;
      return { ...prev, width: naturalWidth, height: naturalHeight };
    });
  }

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-24 shrink-0 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="size-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          onLoad={handleLoad}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
          <Expand className="size-4 text-white drop-shadow" />
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
        {formatImageSubtitle(info, ext)}
      </p>
    </button>
  );
}

/**
 * Admin listing images — thumbnails with dimensions/size, lightbox with prev/next.
 * Uses native <img> to bypass Next.js image optimizer (required for /api/media proxy).
 */
export function AdminListingImagesPanel({ images }) {
  const sorted = useMemo(
    () => [...(images || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [images]
  );

  const [index, setIndex] = useState(null);
  const [lightboxInfo, setLightboxInfo] = useState(null);

  const close = useCallback(() => {
    setIndex(null);
    setLightboxInfo(null);
  }, []);

  const openAt = useCallback((i) => {
    const url = sorted[i]?.url;
    setIndex(i);
    setLightboxInfo(null);
    if (!url) return;
    fetchImageMeta(url).then((remote) => {
      if (remote) setLightboxInfo(remote);
    });
  }, [sorted]);
  const showPrev = useCallback(() => {
    setIndex((i) => (i === null ? null : i > 0 ? i - 1 : sorted.length - 1));
  }, [sorted.length]);
  const showNext = useCallback(() => {
    setIndex((i) => (i === null ? null : i < sorted.length - 1 ? i + 1 : 0));
  }, [sorted.length]);

  useEffect(() => {
    if (index === null) return;
    function onKeyDown(e) {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, showPrev, showNext]);

  if (!sorted.length) {
    return <p className="text-sm text-muted-foreground">No images on this listing.</p>;
  }

  const current = index !== null ? sorted[index] : null;
  const hasMultiple = sorted.length > 1;

  function handleLightboxLoad(e) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setLightboxInfo((prev) => {
      if (prev?.width === naturalWidth && prev?.height === naturalHeight) return prev;
      return { ...prev, width: naturalWidth, height: naturalHeight };
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {sorted.map((img, i) => (
          <ImageThumbnail
            key={img._id ?? img.s3Key ?? img.url ?? i}
            img={img}
            label={`Photo ${i + 1}`}
            onOpen={() => openAt(i)}
          />
        ))}
      </div>

      <Dialog open={index !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden border-none bg-black/95 p-0 sm:rounded-xl">
          <DialogTitle className="sr-only">Photo {(index ?? 0) + 1}</DialogTitle>
          <DialogDescription className="sr-only">
            Photo {(index ?? 0) + 1} of {sorted.length}
          </DialogDescription>

          {current?.url && (
            <div className="relative flex min-h-[50vh] items-center justify-center p-4 pt-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt=""
                className="max-h-[70vh] max-w-full object-contain"
                onLoad={handleLightboxLoad}
              />

              <p className="absolute top-3 start-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {formatImageSubtitle(lightboxInfo, extensionFromImage(current))}
              </p>

              {hasMultiple && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={showPrev}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn("absolute end-2 top-1/2 -translate-y-1/2 rounded-full")}
                    onClick={showNext}
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                  <p className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                    {(index ?? 0) + 1} / {sorted.length}
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
