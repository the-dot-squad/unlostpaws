import { setRequestLocale } from "next-intl/server";
import { PetForm } from "@/components/pets/pet-form";

export default async function NewPetPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-2">
      <PetForm locale={locale} />
    </div>
  );
}
