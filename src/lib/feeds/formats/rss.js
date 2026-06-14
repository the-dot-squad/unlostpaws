/** @file RSS 2.0 feed renderer (spec: https://www.rssboard.org/rss-specification). */

import { escapeXml, cdata } from "@/lib/feeds/xml";
import { listingsBrowseUrl } from "@/lib/feeds/listings";
import { parseFeedFiltersFromUrl } from "@/lib/feeds/url";

/**
 * @param {import("@/lib/feeds/listings").ListingsFeed} feed
 */
export function renderRssFeed(feed) {
  const lastBuildDate = feed.updated.toUTCString();
  const browseUrl = listingsBrowseUrl(feed.language, parseFeedFiltersFromUrl(feed.feedUrl));

  const items = feed.items
    .map((item) => {
      const enclosure = item.image
        ? `\n      <enclosure url="${escapeXml(item.image.url)}" type="${escapeXml(item.image.type)}" />`
        : "";

      const categories = item.categories
        .map((category) => `\n      <category>${escapeXml(category)}</category>`)
        .join("");

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.id)}</guid>
      <pubDate>${item.published.toUTCString()}</pubDate>
      <description>${cdata(item.contentHtml || item.summary)}</description>${categories}${enclosure}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(browseUrl)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>${escapeXml(feed.language)}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>UnLostPaws</generator>
    <atom:link href="${escapeXml(feed.feedUrl)}" rel="self" type="application/rss+xml" />
    <atom:link href="${escapeXml(feed.homeUrl)}" rel="alternate" type="text/html" />
${items ? `${items}\n` : ""}  </channel>
</rss>
`;
}
