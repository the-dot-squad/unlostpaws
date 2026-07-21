import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/config/db";
import { findOwnedPetByPublicId, resolveOwnedPetPublicId } from "@/lib/public-id";
import { PetForm } from "@/components/pets/pet-form";
import { PetDetailView } from "@/components/pets/pet-detail-view";
import { getSession } from "@/lib/auth/session";

export default async function PetDetailPage({ params, searchParams }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const tListings = await getTranslations("listings");
  const tPetTypes = await getTranslations("petTypes");
  const session = await getSession();
  const sp = await searchParams;

  await connectDB();
  const petDoc = await findOwnedPetByPublicId(id, {
    userId: session.user.id,
    status: { $ne: "removed" },
  });

  if (!petDoc) notFound();

  const pet = resolveOwnedPetPublicId(petDoc.toObject());
  const isEditing = sp.edit === "1";

  if (isEditing) {
    if (pet.status === "archived") {
      redirect(`/${locale}/account/pets/${pet.publicId}`);
    }
    return (
      <div className="py-2">
        <PetForm locale={locale} pet={{ ...pet, _id: pet._id.toString() }} />
      </div>
    );
  }

  return (
    <div className="py-2">
      <PetDetailView
        pet={pet}
        locale={locale}
        petTypeLabel={tPetTypes(pet.petType)}
        processingLabel={
          pet.processingStatus && pet.processingStatus !== "ready"
            ? tListings(`processing.${pet.processingStatus}`)
            : ""
        }
      />
    </div>
  );
}
