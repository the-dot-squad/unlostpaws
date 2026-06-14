import { FEED_DEFAULT_FORMAT, FEED_FORMATS } from "@/config/constants/feeds";

/**
 * Resolve feed export format from query param or Accept header.
 * @param {string | undefined} formatParam
 * @param {string | null | undefined} acceptHeader
 */
export function resolveFeedFormat(formatParam, acceptHeader) {
  if (formatParam && FEED_FORMATS.includes(formatParam)) {
    return formatParam;
  }

  const accept = acceptHeader?.toLowerCase() ?? "";
  if (accept.includes("application/atom+xml") || accept.includes("application/atom")) {
    return "atom";
  }
  if (accept.includes("application/feed+json") || accept.includes("application/json")) {
    return "json";
  }
  if (accept.includes("application/rss+xml")) {
    return "rss";
  }

  return FEED_DEFAULT_FORMAT;
}

/** @param {string} format */
export function feedContentType(format) {
  switch (format) {
    case "atom":
      return "application/atom+xml; charset=utf-8";
    case "json":
      return "application/feed+json; charset=utf-8";
    default:
      return "application/rss+xml; charset=utf-8";
  }
}
