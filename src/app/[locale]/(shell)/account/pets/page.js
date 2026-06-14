import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { connectDB } from "@/config/db";
import { OwnedPet } from "@/models/owned-pet";
import { resolveOwnedPetPublicId } from "@/lib/public-id";
import { Button } from "@/components/ui/button";
import { PetCard } from "@/components/pets/pet-card";
import { EmptyState } from "@/components/marketing/empty-state";
import { Plus, PawPrint } from "lucide-react";

export default async function MyPetsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("myPets");
  const tAccount = await getTranslations("account");
  const tPetTypes = await getTranslations("petTypes");
  const tListings = await getTranslations("listings");
  const session = await requireActiveSessionPage(locale);

  await connectDB();
  const pets = (await OwnedPet.find({
    userId: session.user.id,
    status: { $ne: "removed" },
  })
    .sort({ createdAt: -1 })
    .lean()).map(resolveOwnedPetPublicId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{tAccount("petsSubtitle")}</p>
        </div>
        {pets.length > 0 && (
          <Button asChild>
            <Link href={`/${locale}/account/pets/new`}>
              <Plus className="size-4" />
              {t("addPet")}
            </Link>
          </Button>
        )}
      </div>

      {pets.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={t("noPets")}
          description={t("noPetsHint")}
          actionLabel={t("addPet")}
          actionHref={`/${locale}/account/pets/new`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pets.map((pet) => (
            <PetCard
              key={pet._id.toString()}
              pet={pet}
              locale={locale}
              petTypeLabel={tPetTypes(pet.petType)}
              statusLabel={t(`status.${pet.status}`)}
              processingLabel={
                pet.processingStatus && pet.processingStatus !== "ready"
                  ? tListings(`processing.${pet.processingStatus}`)
                  : ""
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
