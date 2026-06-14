"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateMatchStatus } from "@/lib/actions/matches";

export function MatchActions({ matchId }) {
  const t = useTranslations("matches");
  const router = useRouter();

  async function handle(status) {
    const result = await updateMatchStatus(matchId, status);
    if (result?.error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(status === "confirmed" ? t("confirmSuccess") : t("dismissSuccess"));
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" onClick={() => handle("dismissed")}>
        {t("dismiss")}
      </Button>
      <Button size="sm" onClick={() => handle("confirmed")}>
        {t("confirm")}
      </Button>
    </div>
  );
}
