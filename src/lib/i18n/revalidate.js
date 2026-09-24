/** @file Locale-prefixed revalidatePath helpers for next-intl `localePrefix: "always"`. */

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { locales } from "@/i18n/routing";

/**
 * @param {string} locale
 * @param {string} path - App path without locale (`/` or `/account/matches`)
 */
function withLocale(locale, path) {
  if (!path || path === "/") return `/${locale}`;
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Revalidate a path for the current request locale.
 * @param {string} path
 * @param {"page" | "layout" | undefined} [type]
 */
export async function revalidateLocalizedPath(path, type) {
  const locale = await getLocale();
  if (type) {
    revalidatePath(withLocale(locale, path), type);
  } else {
    revalidatePath(withLocale(locale, path));
  }
}

/**
 * Revalidate a path for every supported locale (public content shared across locales).
 * @param {string} path
 * @param {"page" | "layout" | undefined} [type]
 */
export function revalidateLocalizedPathAll(path, type) {
  for (const locale of locales) {
    if (type) {
      revalidatePath(withLocale(locale, path), type);
    } else {
      revalidatePath(withLocale(locale, path));
    }
  }
}
