/** @file generateMetadata helper for CMS-backed marketing pages. */

import { getPublishedContent } from "@/lib/repositories/content";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * @param {object} options
 * @param {string} options.locale
 * @param {string} options.slug — CMS slug
 * @param {string} options.path — URL path after /{locale}/
 */
export async function buildCmsPageMetadata({ locale, slug, path }) {
  const content = await getPublishedContent(slug, locale);
  if (!content) return {};

  return buildPageMetadata({
    locale,
    title: content.title,
    description: content.excerpt || content.title,
    path,
  });
}
