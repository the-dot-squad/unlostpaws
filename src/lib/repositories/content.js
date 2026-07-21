/** @file CMS content reads — fetches pages from DGContent API and falls back to translation files. */

import ContentFetcher from "@/lib/content/client";
import { getMessageFallbackContent } from "@/lib/content/message-fallbacks";

const contentClient = new ContentFetcher();

/**
 * Retrieves the published CMS entry for a public marketing page.
 * Falls back to local translation files if the API is unreachable, not configured, or if the page is missing.
 * @param {string} slug - Page slug (e.g. 'about', 'faq').
 * @param {string} locale - Locale code (e.g. 'en', 'fa').
 * @returns {Promise<{ title: string, slug: string, locale: string, excerpt: string, body: string }>} Serialized page content.
 */
export async function getPublishedContent(slug, locale) {
  try {
    const page = await contentClient.getPage(slug, locale);
    if (page) {
      return {
        title: page.title,
        slug: page.slug,
        locale: page.language,
        excerpt: page.excerpt || "",
        body: page.contentHtml || "",
      };
    }
  } catch (error) {
    console.error(`Failed to fetch DGContent for page "${slug}" (${locale}):`, error);
  }

  // Fallback to local translations when API is unreachable or has no entry
  return getMessageFallbackContent(slug, locale);
}
