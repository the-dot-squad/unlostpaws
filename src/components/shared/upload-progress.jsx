"use client";

import { cn } from "@/lib/utils";
import { Loader2, AlertCircle } from "lucide-react";

export function UploadProgressBar({ value, className }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-background/40", className)}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function UploadProgressOverlay({ progress, label, error }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 bg-background/75 p-2 backdrop-blur-[1px]">
      {error ? (
        <>
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-center text-xs text-destructive">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="size-5 animate-spin text-primary" />
          <UploadProgressBar value={progress} />
          <p className="text-center text-xs font-medium text-foreground">{label}</p>
        </>
      )}
    </div>
  );
}
