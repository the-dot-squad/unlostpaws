"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateMatchStatus } from "@/lib/actions/matches";

export function MatchActions({ matchId }) {
  const t = useTranslations("matches");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState(null);

  async function handle(status) {
    if (pending) return;
    setPending(status);
    try {
      const result = await updateMatchStatus(matchId, status);
      if (result?.error) {
        toast.error(t("actionError"));
        return;
      }
      toast.success(status === "confirmed" ? t("confirmSuccess") : t("dismissSuccess"));
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  const busy = Boolean(pending);

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => handle("dismissed")}
      >
        {pending === "dismissed" ? tCommon("loading") : t("dismiss")}
      </Button>
      <Button size="sm" disabled={busy} onClick={() => handle("confirmed")}>
        {pending === "confirmed" ? tCommon("loading") : t("confirm")}
      </Button>
    </div>
  );
}
