/** @typedef {"ltr" | "rtl"} TextDirection */
/** @typedef {"latin" | "arabic"} FontGroup */

/**
 * Per-locale overrides. Keys must match `routing.locales`.
 * @type {Record<string, { direction: TextDirection, font: FontGroup }>}
 */
export const LOCALE_META = {
  en: { direction: "ltr", font: "latin" },
  fa: { direction: "rtl", font: "arabic" },
};

/** ISO 639-1 language subtags that use right-to-left layout. */
export const RTL_LANGUAGES = new Set([
  "ar", // Arabic
  "fa", // Persian
  "he", // Hebrew
  "ur", // Urdu
  "ps", // Pashto
  "sd", // Sindhi
  "ku", // Kurdish
  "dv", // Divehi
  "yi", // Yiddish
]);

/**
 * ISO 639-1 language subtags mapped to non-Latin font groups.
 * Unlisted languages fall back to `latin` (Inter).
 * @type {Record<string, FontGroup>}
 */
export const FONT_GROUP_BY_LANGUAGE = {
  ar: "arabic",
  fa: "arabic",
  ur: "arabic",
  ps: "arabic",
  sd: "arabic",
  // ku often uses Arabic script; Hebrew-script ku would need a future "hebrew" group
  ku: "arabic",
};

export const DEFAULT_LOCALE_META = { direction: "ltr", font: "latin" };
