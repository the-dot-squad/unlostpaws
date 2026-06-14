/** @file Syndication feed limits and supported export formats. */

/** Max items per feed response (RSS/Atom/JSON Feed). */
export const FEED_MAX_ITEMS = 50;

/** CDN / edge cache TTL in seconds. */
export const FEED_CACHE_SECONDS = 300;

/** Supported export formats via `?format=` or Accept header. */
export const FEED_FORMATS = ["rss", "atom", "json"];

/** Default format when none is requested. */
export const FEED_DEFAULT_FORMAT = "rss";
