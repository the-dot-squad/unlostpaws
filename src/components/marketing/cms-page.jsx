import { notFound } from "next/navigation";
import { ContentPage } from "@/components/marketing/content-page";
import { HtmlContent } from "@/components/marketing/html-content";
import { getPublishedContent } from "@/lib/repositories/content";

/**
 * Renders a public site page from a CMS slug.
 * @param {object} props
 * @param {string} props.slug — CMS slug (e.g. "about-us")
 * @param {string} props.locale
 * @param {import("lucide-react").LucideIcon} props.icon
 */
export async function CmsPage({ slug, locale, icon: Icon }) {
  const content = await getPublishedContent(slug, locale);
  if (!content) notFound();

  return (
    <ContentPage title={content.title} subtitle={content.excerpt} icon={Icon}>
      <HtmlContent html={content.body} />
    </ContentPage>
  );
}
