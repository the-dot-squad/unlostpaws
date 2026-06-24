"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveOwnedPet } from "@/lib/actions/owned-pets";

export function ArchivePetButton({ petId, locale }) {
  const t = useTranslations("myPets");
  const router = useRouter();

  async function handleArchive() {
    const result = await archiveOwnedPet(petId);
    if (result.error) {
      toast.error(t("notFound"));
      return;
    }
    toast.success(t("archived"));
    router.push(`/${locale}/account/pets`);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleArchive} className="gap-1.5">
      <Archive className="size-3.5" />
      {t("archive")}
    </Button>
  );
}
