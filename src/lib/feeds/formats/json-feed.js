/** @file JSON Feed 1.1 renderer (https://jsonfeed.org/version/1.1). */

import { listingsBrowseUrl } from "@/lib/feeds/listings";
import { parseFeedFiltersFromUrl } from "@/lib/feeds/url";

/**
 * @param {import("@/lib/feeds/listings").ListingsFeed} feed
 */
export function renderJsonFeed(feed) {
  const browseUrl = listingsBrowseUrl(feed.language, parseFeedFiltersFromUrl(feed.feedUrl));

  const payload = {
    version: "https://jsonfeed.org/version/1.1",
    title: feed.title,
    description: feed.description,
    home_page_url: feed.homeUrl,
    feed_url: feed.feedUrl,
    language: feed.language,
    authors: [{ name: feed.author }],
    items: feed.items.map((item) => ({
      id: item.id,
      url: item.link,
      title: item.title,
      summary: item.summary,
      content_html: item.contentHtml || undefined,
      date_published: item.published.toISOString(),
      date_modified: item.updated.toISOString(),
      tags: item.categories.length > 0 ? item.categories : undefined,
      image: item.image?.url,
      attachments: item.image
        ? [{ url: item.image.url, mime_type: item.image.type }]
        : undefined,
    })),
    _unlostpaws: {
      browse_url: browseUrl,
      updated: feed.updated.toISOString(),
    },
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
