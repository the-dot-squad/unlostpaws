import { Inter, Vazirmatn } from "next/font/google";
import { fontGroupForLocale } from "@/config/locales";

/** Latin-script / LTR default — Inter */
export const inter = Inter({
  variable: "--font-family",
  subsets: ["latin"],
  display: "swap",
});

/** Arabic-script / Persian — Vazirmatn (also covers Arabic, Urdu, etc.) */
export const vazirmatn = Vazirmatn({
  variable: "--font-family",
  subsets: ["arabic", "latin"],
  display: "swap",
});

/**
 * Font instances keyed by locale font group.
 * Add new groups here when supporting CJK, Cyrillic, Devanagari, etc.
 * @type {Record<import("@/config/locales").FontGroup, typeof inter>}
 */
const FONTS_BY_GROUP = {
  latin: inter,
  arabic: vazirmatn,
};

const DEFAULT_FONT = FONTS_BY_GROUP.latin;

/** Next.js font loader for a locale (resolved via locale config + language fallbacks). */
export function fontForLocale(locale) {
  const group = fontGroupForLocale(locale);
  return FONTS_BY_GROUP[group] ?? DEFAULT_FONT;
}

export function fontClassForLocale(locale) {
  return fontForLocale(locale).className;
}

export function fontVariableForLocale(locale) {
  return fontForLocale(locale).variable;
}
