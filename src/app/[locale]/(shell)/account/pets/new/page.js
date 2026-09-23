import { setRequestLocale } from "next-intl/server";
import { PetForm } from "@/components/pets/pet-form";
import { getSession } from "@/lib/auth/session";
import { isPremium } from "@/lib/premium/entitlements";

export default async function NewPetPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  const premium = isPremium(session?.user);

  return (
    <div className="py-2">
      <PetForm locale={locale} premium={premium} />
    </div>
  );
}
