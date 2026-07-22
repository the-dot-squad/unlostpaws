"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminPurgeListing } from "@/lib/actions/admin";
import { listingPath } from "@/lib/paths";
import { routing } from "@/i18n/routing";
import { toast } from "sonner";
import { AdminRequeueProcessingButton } from "@/components/admin/requeue-processing-button";

/** Row actions for admin listings: view public ad, edit, requeue, purge. */
export function AdminListingActions({
  listingId,
  locale = routing.defaultLocale,
  processingStatus,
  processingError,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const publicUrl = listingPath(listingId, locale);

  async function handleDelete() {
    if (
      !window.confirm(
        "Permanently delete this listing? All photos, vectors, moderation history, and the record will be erased. This cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await adminPurgeListing(listingId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Listing deleted");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" asChild>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" title="View public ad">
          <ExternalLink className="size-3.5" />
          <span className="sr-only">View</span>
        </a>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <Link href={`/admin/listings/${listingId}`} title="Edit listing">
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>
      <AdminRequeueProcessingButton
        kind="listing"
        publicId={listingId}
        status={processingStatus}
        processingError={processingError}
        variant="icon"
      />
      <Button
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
        title="Delete listing permanently"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
        <span className="sr-only">{loading ? "Deleting…" : "Delete"}</span>
      </Button>
    </div>
  );
}
