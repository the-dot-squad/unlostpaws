import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { getAuthUserById } from "@/lib/auth/users";
import { hasConfirmedAge } from "@/lib/auth/age";
import { CreateListingForm } from "@/components/listings/create-listing-form";
import { PageHeader } from "@/components/marketing/page-header";
import { ContentBody } from "@/components/marketing/content-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LISTING_TYPES, PET_TYPES } from "@/config/constants/enums";
import { hasSetCoordinates } from "@/lib/geo";

/**
 * Parse create-form prefill values from URL search params (sighting CTA, deep links).
 * @param {Record<string, string | string[] | undefined>} sp
 */
function prefillFromSearchParams(sp) {
  const str = (key) => {
    const v = sp[key];
    if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
    return typeof v === "string" ? v : "";
  };

  const type = str("type");
  const petType = str("petType");
  const lat = Number.parseFloat(str("lat"));
  const lng = Number.parseFloat(str("lng"));
  const hasCoords = hasSetCoordinates(lng, lat);

  return {
    type: LISTING_TYPES.includes(type) ? type : undefined,
    petType: PET_TYPES.includes(petType) ? petType : undefined,
    color: str("color").trim() || undefined,
    breed: str("breed").trim() || undefined,
    address: str("address").trim() || undefined,
    city: str("city").trim() || undefined,
    country: str("country").trim() || undefined,
    lat: hasCoords ? lat : undefined,
    lng: hasCoords ? lng : undefined,
  };
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    locale,
    title: t("createListingTitle"),
    description: t("createListingDescription"),
    path: "listings/new",
    noIndex: true,
  });
}

export default async function NewListingPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await requireActiveSessionPage(locale);
  const authUser = await getAuthUserById(session.user.id);

  if (!hasConfirmedAge(authUser)) {
    redirect(`/${locale}/age`);
  }

  const sp = await searchParams;
  const prefill = prefillFromSearchParams(sp);

  return (
    <>
      <PageHeader
        title={t("listings.createTitle")}
        description={t("listings.createSubtitle")}
        icon={FilePlus2}
      />

      <ContentBody wide className="py-6 md:py-8" containerClassName="flex justify-center">
        <CreateListingForm locale={locale} prefill={prefill} />
      </ContentBody>
    </>
  );
}
