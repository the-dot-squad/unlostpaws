/** @file Resolve request locale from next-intl cookie or Accept-Language. */

import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import { defaultLocale, locales } from "@/i18n/routing";

/** next-intl default locale cookie name. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** @param {unknown} value @returns {string | null} */
export function coerceLocale(value) {
  if (typeof value === "string" && hasLocale(locales, value)) return value;
  return null;
}

/**
 * Pick the first supported locale from an Accept-Language header.
 * @param {string | null | undefined} header
 * @returns {string | null}
 */
export function localeFromAcceptLanguage(header) {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0]?.split("-")[0]?.toLowerCase();
    const match = coerceLocale(tag);
    if (match) return match;
  }
  return null;
}

/**
 * Read NEXT_LOCALE from a raw Cookie header.
 * @param {string | null | undefined} cookieHeader
 * @returns {string | null}
 */
export function localeFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/i);
  return coerceLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
}

/**
 * Resolve locale for the current Next.js request (cookie → Accept-Language → default).
 * @returns {Promise<string>}
 */
export async function resolveRequestLocale() {
  try {
    const cookieStore = await cookies();
    const fromCookie = coerceLocale(cookieStore.get(LOCALE_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // Outside a request context (e.g. scripts).
  }

  try {
    const hdrs = await headers();
    const fromAccept = localeFromAcceptLanguage(hdrs.get("accept-language"));
    if (fromAccept) return fromAccept;
  } catch {
    // Outside a request context.
  }

  return defaultLocale;
}

/**
 * Resolve locale from a better-auth middleware context.
 * @param {{ getCookie?: (name: string) => string | undefined; headers?: Headers; request?: Request }} ctx
 * @returns {string}
 */
export function resolveAuthRequestLocale(ctx) {
  const fromGetCookie =
    typeof ctx.getCookie === "function" ? coerceLocale(ctx.getCookie(LOCALE_COOKIE)) : null;
  if (fromGetCookie) return fromGetCookie;

  const cookieHeader =
    ctx.headers?.get?.("cookie") ||
    (typeof ctx.request?.headers?.get === "function"
      ? ctx.request.headers.get("cookie")
      : null);
  const fromHeader = localeFromCookieHeader(cookieHeader);
  if (fromHeader) return fromHeader;

  const accept =
    ctx.headers?.get?.("accept-language") ||
    (typeof ctx.request?.headers?.get === "function"
      ? ctx.request.headers.get("accept-language")
      : null);
  return localeFromAcceptLanguage(accept) || defaultLocale;
}
