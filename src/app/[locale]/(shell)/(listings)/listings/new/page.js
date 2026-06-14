import { setRequestLocale, getTranslations } from "next-intl/server";
import { FilePlus2 } from "lucide-react";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { CreateListingForm } from "@/components/listings/create-listing-form";
import { PageHeader } from "@/components/marketing/page-header";
import { ContentBody } from "@/components/marketing/content-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    locale,
    title: t("createListingTitle"),
    description: t("defaultDescription"),
    path: "listings/new",
    noIndex: true,
  });
}

export default async function NewListingPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  await requireActiveSessionPage(locale);

  const sp = await searchParams;

  return (
    <>
      <PageHeader
        title={t("listings.createTitle")}
        description={t("listings.createSubtitle")}
        icon={FilePlus2}
      />

      <ContentBody wide className="py-6 md:py-8" containerClassName="flex justify-center">
        <CreateListingForm locale={locale} defaultType={sp.type} />
      </ContentBody>
    </>
  );
}
