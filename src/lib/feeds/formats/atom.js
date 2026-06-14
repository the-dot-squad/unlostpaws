/** @file Atom 1.0 feed renderer (RFC 4287). */

import { escapeXml, cdata } from "@/lib/feeds/xml";
import { listingsBrowseUrl } from "@/lib/feeds/listings";
import { parseFeedFiltersFromUrl } from "@/lib/feeds/url";

/**
 * @param {import("@/lib/feeds/listings").ListingsFeed} feed
 */
export function renderAtomFeed(feed) {
  const updated = feed.updated.toISOString();
  const browseUrl = listingsBrowseUrl(feed.language, parseFeedFiltersFromUrl(feed.feedUrl));

  const entries = feed.items
    .map((item) => {
      const categories = item.categories
        .map(
          (category) =>
            `\n      <category term="${escapeXml(category)}" label="${escapeXml(category)}" />`
        )
        .join("");

      const enclosure = item.image
        ? `\n      <link href="${escapeXml(item.image.url)}" rel="enclosure" type="${escapeXml(item.image.type)}" />`
        : "";

      return `    <entry>
      <title type="text">${escapeXml(item.title)}</title>
      <link href="${escapeXml(item.link)}" rel="alternate" type="text/html" />
      <id>${escapeXml(item.id)}</id>
      <published>${item.published.toISOString()}</published>
      <updated>${item.updated.toISOString()}</updated>
      <summary type="text">${escapeXml(item.summary)}</summary>
      <content type="html">${cdata(item.contentHtml || item.summary)}</content>${categories}${enclosure}
    </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">${escapeXml(feed.title)}</title>
  <subtitle type="text">${escapeXml(feed.description)}</subtitle>
  <link href="${escapeXml(feed.feedUrl)}" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(browseUrl)}" rel="alternate" type="text/html" />
  <link href="${escapeXml(feed.homeUrl)}" rel="related" type="text/html" />
  <id>${escapeXml(feed.feedUrl)}</id>
  <updated>${updated}</updated>
  <author>
    <name>${escapeXml(feed.author)}</name>
  </author>
  <generator uri="https://unlostpaws.com">UnLostPaws</generator>
${entries ? `${entries}\n` : ""}</feed>
`;
}
