/** @file Locale-prefixed absolute URL helpers shared by SEO and email. */

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
export const NOINDEX_PATH_PREFIXES = ["account", "login", "listings/new"];

const baseUrl = env.app.url.replace(/\/$/, "");

/**
 * Build an absolute URL for a locale-prefixed path.
 * @param {string} locale
 * @param {string} [path] — segment after /{locale}/ (with or without leading slash)
 */
export function absoluteUrl(locale, path = "") {
  const normalized = path.replace(/^\//, "").replace(/\/$/, "");
  return normalized ? `${baseUrl}/${locale}/${normalized}` : `${baseUrl}/${locale}`;
}

/** Alias used by transactional email templates. */
export function appUrl(locale, path) {
  return absoluteUrl(locale, path);
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
