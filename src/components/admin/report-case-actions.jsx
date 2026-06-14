"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { resolveReportCase } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Case-level moderation actions — applies to every open report in the group.
 */
export function ReportCaseActions({ listingId, reason }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(action) {
    setLoading(true);
    const result = await resolveReportCase({ listingId, reason, action, note });
    setLoading(false);

    if (result?.success) {
      toast.success("Case resolved");
      router.refresh();
      return;
    }
    toast.error(result?.error ?? "Could not resolve case");
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Moderator note (included in user emails when applicable)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handle("dismiss")}
        >
          Dismiss case
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => handle("confirm_violation")}
        >
          Confirm violation (warn)
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={() => handle("remove_listing")}
        >
          Soft remove listing
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={() => handle("purge_listing")}
        >
          Purge permanently
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Soft remove hides the ad but keeps it in the owner&apos;s history and records a strike.
        Purge permanently deletes photos, vectors, and the listing record.
      </p>
    </div>
  );
}
