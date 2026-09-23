import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/config/db";
import { resolveTagPage, serializePublicTagPet } from "@/lib/pets/digital-collar";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { TagEmergencyView, TagInactiveView } from "@/components/tag/tag-emergency-view";
import { toPlainObject } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { locale, publicId } = await params;
  const t = await getTranslations({ locale, namespace: "tag" });

  return buildPageMetadata({
    locale,
    path: `tag/${publicId}`,
    title: t("metaTitle"),
    description: t("metaDescription"),
    noIndex: true,
  });
}

export default async function TagPage({ params }) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);

  await connectDB();
  const resolved = await resolveTagPage(publicId);
  if (resolved.kind === "missing") notFound();

  const tPetTypes = await getTranslations("petTypes");
  const petDoc = toPlainObject(resolved.pet);

  if (resolved.kind === "inactive") {
    const pet = serializePublicTagPet(petDoc, { includeEmergency: false });
    return <TagInactiveView pet={pet} locale={locale} />;
  }

  const pet = serializePublicTagPet(petDoc, { includeEmergency: true });
  return (
    <TagEmergencyView
      pet={pet}
      petTypeLabel={tPetTypes(pet.petType)}
      locale={locale}
    />
  );
}
