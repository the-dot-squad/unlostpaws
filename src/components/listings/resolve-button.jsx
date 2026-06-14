"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveListing } from "@/lib/actions/listings";
import { useRouter } from "next/navigation";

/** Owner action to close an active alert when the pet has been reunited or found. */
export function ResolveButton({ listingId }) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    const result = await resolveListing(listingId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t("listings.resolvedSuccess"));
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResolve}
      disabled={loading}
      className="border-green-600/40 text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-950/40"
    >
      <CheckCircle2 className="me-2 size-4" />
      {loading ? t("common.loading") : t("listings.markResolved")}
    </Button>
  );
}
