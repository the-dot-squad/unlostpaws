"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeOwnedPet } from "@/lib/actions/owned-pets";

export function DeletePetButton({ petId, locale }) {
  const t = useTranslations("myPets");
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(t("deleteConfirm") || "Are you sure you want to delete this pet?")) {
      return;
    }

    const result = await removeOwnedPet(petId);
    if (result.error) {
      toast.error(t("notFound"));
      return;
    }
    toast.success(t("deleted"));
    router.push(`/${locale}/account/pets`);
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
      <Trash2 className="size-3.5" />
      {t("delete")}
    </Button>
  );
}
