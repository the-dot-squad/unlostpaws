"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  adminRequeueListingProcessing,
  adminRequeueOwnedPetProcessing,
} from "@/lib/actions/admin";
import { processingErrorKey } from "@/lib/intelligence/processing";

/**
 * Staff-only ML requeue control for listings and owned pets.
 *
 * @param {object} props
 * @param {"listing"|"owned-pet"} props.kind
 * @param {string} props.publicId
 * @param {string} [props.status]
 * @param {string} [props.processingError]
 * @param {"default"|"icon"} [props.variant]
 */
export function AdminRequeueProcessingButton({
  kind,
  publicId,
  status,
  processingError,
  variant = "default",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const show =
    status === "failed" || status === "pending" || status === "processing";
  if (!show) return null;

  async function handleRequeue() {
    setLoading(true);
    try {
      const result =
        kind === "owned-pet"
          ? await adminRequeueOwnedPetProcessing(publicId)
          : await adminRequeueListingProcessing(publicId);

      if (result?.error) {
        toast.error(String(result.error));
        return;
      }

      toast.success("Photo analysis requeued");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const errorHint =
    status === "failed" && processingError
      ? processingErrorKey(processingError)
      : null;

  if (variant === "icon") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleRequeue}
        disabled={loading}
        title="Requeue photo analysis"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        <span className="sr-only">Requeue photo analysis</span>
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={handleRequeue}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="me-2 size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="me-2 size-3.5" />
        )}
        Requeue photo analysis
      </Button>
      {errorHint ? (
        <p className="text-xs text-muted-foreground">Error key: {errorHint}</p>
      ) : null}
      {processingError && status === "failed" ? (
        <p className="break-all font-mono text-[10px] text-muted-foreground">
          {processingError}
        </p>
      ) : null}
    </div>
  );
}
