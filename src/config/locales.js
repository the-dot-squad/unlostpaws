/**
 * Locale registry — single place to define behavior when adding languages.
 *
 * 1. Add an entry to `LOCALE_META` in `src/config/constants/locales.js`.
 * 2. Add message files under `messages/`.
 * 3. Update `routing.locales` in `src/i18n/routing.js`.
 *
 * Font groups and text direction can also be inferred from the BCP-47 language
 * subtag (e.g. `ar-EG` → Arabic script) when a locale is not listed explicitly.
 */

import {
  DEFAULT_LOCALE_META,
  FONT_GROUP_BY_LANGUAGE,
  LOCALE_META,
  RTL_LANGUAGES,
} from "@/config/constants/locales";

/** @typedef {"ltr" | "rtl"} TextDirection */
/** @typedef {"latin" | "arabic"} FontGroup */

/** BCP-47 language subtag, e.g. "fa" from "fa-IR". */
export function languageSubtag(locale) {
  return locale.split("-")[0]?.toLowerCase() ?? locale;
}

/** Resolved metadata for a locale, with language-subtag fallbacks. */
export function getLocaleMeta(locale) {
  const explicit = LOCALE_META[locale];
  if (explicit) return explicit;

  const lang = languageSubtag(locale);

  return {
    direction: RTL_LANGUAGES.has(lang) ? "rtl" : DEFAULT_LOCALE_META.direction,
    font: FONT_GROUP_BY_LANGUAGE[lang] ?? DEFAULT_LOCALE_META.font,
  };
}

/** Text direction for layout (`dir` attribute). */
export function directionForLocale(locale) {
  return getLocaleMeta(locale).direction;
}

/** Font group key used by `src/lib/fonts.js`. */
export function fontGroupForLocale(locale) {
  return getLocaleMeta(locale).font;
}

/** Whether the locale uses right-to-left layout. */
export function isRtlLocale(locale) {
  return directionForLocale(locale) === "rtl";
}
