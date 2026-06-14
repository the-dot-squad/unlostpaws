"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminExtendListing } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";

/** Admin extension control — always available regardless of user extension window. */
export function AdminListingExtensionPanel({ listing, extensionDays }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExtend() {
    setLoading(true);
    const result = await adminExtendListing(listing.publicId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Listing extended");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {listing.expiresAt ? (
        <p className="text-sm text-muted-foreground">
          Expires {formatDate(listing.expiresAt)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No expiry date set</p>
      )}
      {listing.extensionCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          Extended {listing.extensionCount} time{listing.extensionCount === 1 ? "" : "s"}
        </p>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={handleExtend} disabled={loading}>
        {loading ? "Extending…" : `Extend by ${extensionDays} days`}
      </Button>
    </div>
  );
}
