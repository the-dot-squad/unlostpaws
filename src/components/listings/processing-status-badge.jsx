"use client";

import { Badge } from "@/components/ui/badge";

const VARIANTS = {
  pending: "secondary",
  processing: "secondary",
  ready: "default",
  failed: "destructive",
};

/** Shows ML processing state for a listing or owned pet. */
export function ProcessingStatusBadge({ status, label }) {
  if (!status || status === "ready") {
    return null;
  }

  return (
    <Badge variant={VARIANTS[status] || "secondary"} className="text-xs">
      {label}
    </Badge>
  );
}
