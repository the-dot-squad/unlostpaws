/** @file Public route paths and absolute URL helpers for SEO. */

import { env } from "@/config/env";
import { locales } from "@/i18n/routing";

/** Static public paths (no leading slash, relative to /{locale}/). */
export const PUBLIC_STATIC_PATHS = [
  "",
  "listings",
  "map",
  "about",
  "contact",
  "faq",
  "terms",
  "terms/privacy",
];

/** Path prefixes that must not be indexed. */
export const NOINDEX_PATH_PREFIXES = ["account", "sign-in", "listings/new"];

const baseUrl = env.app.url.replace(/\/$/, "");

/**
 * Build an absolute URL for a locale-prefixed path.
 * @param {string} locale
 * @param {string} [path] — segment after /{locale}/ (empty for home)
 */
export function absoluteUrl(locale, path = "") {
  const normalized = path.replace(/^\//, "").replace(/\/$/, "");
  return normalized ? `${baseUrl}/${locale}/${normalized}` : `${baseUrl}/${locale}`;
}

/**
 * hreflang alternates for all supported locales.
 * @param {string} path — segment after /{locale}/
 */
export function localeAlternates(path = "") {
  const alternates = Object.fromEntries(
    locales.map((locale) => [locale, absoluteUrl(locale, path)])
  );
  // Add x-default pointing to the default English locale
  alternates["x-default"] = absoluteUrl("en", path);
  return alternates;
}

/** @param {string} path */
export function isNoindexPath(path) {
  const normalized = path.replace(/^\//, "");
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
