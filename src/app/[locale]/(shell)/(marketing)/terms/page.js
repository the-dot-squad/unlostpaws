import { setRequestLocale } from "next-intl/server";
import { Scale } from "lucide-react";
import { CmsPage } from "@/components/marketing/cms-page";
import { ROUTE_CONTENT_SLUGS } from "@/config/constants/site-routes";
import { buildCmsPageMetadata } from "@/lib/seo/cms-metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildCmsPageMetadata({
    locale,
    slug: ROUTE_CONTENT_SLUGS.terms,
    path: "terms",
  });
}

export default async function TermsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CmsPage slug={ROUTE_CONTENT_SLUGS.terms} locale={locale} icon={Scale} />;
}
