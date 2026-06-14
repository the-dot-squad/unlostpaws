import { env } from "@/config/env";
import { imageContentTypeFromExtension } from "@/lib/storage/images";
import { resolveImageUrl } from "@/lib/storage/urls";

const baseUrl = env.app.url.replace(/\/$/, "");

/**
 * @param {string} pathOrUrl
 */
export function absoluteMediaUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

/**
 * @param {object | null | undefined} image
 */
export function feedImageFromListing(image) {
  const url = absoluteMediaUrl(resolveImageUrl(image));
  if (!url) return null;

  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  const type = imageContentTypeFromExtension(ext);
  if (type === "application/octet-stream") return null;

  return { url, type };
}

/**
 * Build a canonical feed URL with filter and format query params.
 * @param {string} feedPath — path after /{locale}/
 * @param {object} options
 * @param {string} options.locale
 * @param {object} [options.filters]
 * @param {string} [options.format]
 */
export function buildFeedUrl(feedPath, { locale, filters = {}, format }) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.petType) params.set("petType", filters.petType);
  if (filters.country) params.set("country", filters.country);
  if (format) params.set("format", format);

  const query = params.toString();
  const path = `${baseUrl}/${locale}/${feedPath.replace(/^\//, "")}`;
  return query ? `${path}?${query}` : path;
}

/**
 * @param {string} feedUrl
 * @returns {{ type?: string, petType?: string, country?: string }}
 */
export function parseFeedFiltersFromUrl(feedUrl) {
  try {
    const url = new URL(feedUrl);
    return {
      type: url.searchParams.get("type") || undefined,
      petType: url.searchParams.get("petType") || undefined,
      country: url.searchParams.get("country") || undefined,
    };
  } catch {
    return {};
  }
}
