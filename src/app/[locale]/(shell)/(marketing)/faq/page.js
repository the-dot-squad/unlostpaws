import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CircleHelp } from "lucide-react";
import { ContentPage } from "@/components/marketing/content-page";
import { HtmlContent } from "@/components/marketing/html-content";
import { FaqList } from "@/components/marketing/faq-list";
import { getPublishedContent } from "@/lib/repositories/content";
import { parseFaqBody } from "@/lib/content/parse-faq";
import { ROUTE_CONTENT_SLUGS } from "@/config/constants/site-routes";
import { buildCmsPageMetadata } from "@/lib/seo/cms-metadata";
import { getFaqJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildCmsPageMetadata({
    locale,
    slug: ROUTE_CONTENT_SLUGS.faq,
    path: "faq",
  });
}

export default async function FaqPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = await getPublishedContent(ROUTE_CONTENT_SLUGS.faq, locale);
  if (!content) {
    notFound();
  }

  const { intro, items } = parseFaqBody(content.body ?? "");
  const jsonLd = getFaqJsonLd(items);

  return (
    <ContentPage title={content.title} subtitle={content.excerpt} icon={CircleHelp}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {intro ? <HtmlContent html={intro} /> : null}
      <FaqList items={items} />
    </ContentPage>
  );
}
