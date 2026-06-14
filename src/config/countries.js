import { ISO_COUNTRY_CODES } from "@/config/constants/countries";

/**
 * @param {string} locale BCP 47 locale (e.g. "en", "fa")
 * @returns {Array<{ code: string, name: string }>}
 */
export function getCountryOptions(locale = "en") {
  const display = new Intl.DisplayNames([locale], { type: "region" });

  return ISO_COUNTRY_CODES.map((code) => ({
    code,
    name: display.of(code) || code,
  })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

/**
 * @param {string} code ISO alpha-2
 * @param {string} locale
 * @returns {string}
 */
export function getCountryName(code, locale = "en") {
  if (!code) return "";
  const display = new Intl.DisplayNames([locale], { type: "region" });
  return display.of(code.toUpperCase()) || code;
}

/**
 * Normalize and validate a country query param (ISO 3166-1 alpha-2).
 * Returns undefined when the value is missing or not a known code.
 *
 * @param {string | undefined} code
 * @returns {string | undefined}
 */
export function normalizeCountryCode(code) {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return ISO_COUNTRY_CODES.includes(upper) ? upper : undefined;
}
