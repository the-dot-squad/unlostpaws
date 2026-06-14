"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    <Button variant="destructive" size="sm" onClick={handleArchive}>
      {t("archive")}
    </Button>
  );
}
