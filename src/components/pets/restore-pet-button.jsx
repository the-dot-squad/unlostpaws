"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreOwnedPet } from "@/lib/actions/owned-pets";

export function RestorePetButton({ petId, locale }) {
  const t = useTranslations("myPets");
  const router = useRouter();

  async function handleRestore() {
    const result = await restoreOwnedPet(petId);
    if (result.error) {
      toast.error(t("notFound"));
      return;
    }
    toast.success(t("restored"));
    router.refresh();
  }

  return (
    <Button variant="default" size="sm" onClick={handleRestore} className="gap-1.5">
      <ArchiveRestore className="size-3.5" />
      {t("restore")}
    </Button>
  );
}
