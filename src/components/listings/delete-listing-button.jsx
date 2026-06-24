"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteListing } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId, locale }) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(t("listings.deleteListingConfirm") || "Are you sure you want to delete this alert? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    const result = await deleteListing(listingId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t("listings.deleteListingSuccess"));
    router.push(`/${locale}/account/listings`);
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="border-red-600/40 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      <Trash2 className="me-2 size-4" />
      {loading ? t("common.loading") : t("listings.deleteListing")}
    </Button>
  );
}
