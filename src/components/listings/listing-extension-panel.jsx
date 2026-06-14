"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { extendListing } from "@/lib/actions/listings";
import { canUserExtendListing } from "@/lib/listings/expiry";
import { formatDate } from "@/lib/format";

/**
 * Owner extension UI shown on the listing edit form.
 */
export function ListingExtensionPanel({ listingId, listing, extensionPolicy, extensionLocked }) {
  const t = useTranslations("listings.extension");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(listing.expiresAt);

  const check = canUserExtendListing(
    { status: listing.status, expiresAt, extensionLocked },
    {
      listingExtensionEnabled: extensionPolicy.enabled,
      listingExtensionFromDay: extensionPolicy.fromDay,
    }
  );

  async function handleExtend() {
    setLoading(true);
    const result = await extendListing(listingId);
    setLoading(false);

    if (result.error) {
      const key = `errors.${result.error}`;
      toast.error(t.has(key) ? t(key) : t("errors.generic"));
      return;
    }

    if (result.expiresAt) {
      setExpiresAt(result.expiresAt);
    }
    toast.success(t("success"));
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{t("title")}</p>
          {expiresAt ? (
            <p className="text-sm text-muted-foreground">
              {t("expiresOn", { date: formatDate(expiresAt) })}
            </p>
          ) : null}
          {!extensionPolicy.enabled ? (
            <p className="text-sm text-muted-foreground">{t("disabled")}</p>
          ) : check.allowed ? (
            <p className="text-sm text-muted-foreground">
              {t("canExtend", {
                days: extensionPolicy.extensionDays,
                remaining: check.daysUntil,
              })}
            </p>
          ) : check.reason === "too_early" ? (
            <p className="text-sm text-muted-foreground">
              {t("tooEarly", { fromDay: check.fromDay, remaining: check.daysUntil })}
            </p>
          ) : check.reason === "already_expired" ? (
            <p className="text-sm text-muted-foreground">{t("expired")}</p>
          ) : check.reason === "reunion_confirmed" ? (
            <p className="text-sm text-muted-foreground">{t("reunionLocked")}</p>
          ) : null}
        </div>
      </div>

      {check.allowed ? (
        <Button type="button" variant="secondary" onClick={handleExtend} disabled={loading}>
          {loading ? t("extending") : t("extendButton", { days: extensionPolicy.extensionDays })}
        </Button>
      ) : null}
    </div>
  );
}
