/** @file Shared display formatting — dates, byte sizes, etc. */

import { timeZone } from "@/i18n/routing";

/** BCP-47 tags for Intl formatters. */
const INTL_LOCALES = { en: "en-US", fa: "fa-IR" };

/**
 * @param {string | number | Date} value
 * @param {string} [locale]
 * @returns {Date}
 */
function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * @param {"date"|"datetime"|"datetime-full"} style
 * @param {string} locale
 */
function dateFormatter(style, locale) {
  const intlLocale = INTL_LOCALES[locale] || locale || "en-US";

  if (style === "date") {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone,
    });
  }

  if (style === "datetime-full") {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    });
  }

  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
}

/**
 * Medium date + short time — listing metadata, timestamps, etc.
 * @param {string | number | Date} value
 * @param {string} [locale]
 */
export function formatDateTime(value, locale = "en") {
  return dateFormatter("datetime", locale).format(toDate(value));
}

/** Date only — compact tables and lists. */
export function formatDate(value, locale = "en") {
  return dateFormatter("date", locale).format(toDate(value));
}

/** Long date + time — admin detail rows. */
export function formatDateTimeFull(value, locale = "en") {
  return dateFormatter("datetime-full", locale).format(toDate(value));
}

/**
 * Human-readable byte sizes for dashboard storage metrics.
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  if (!bytes || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}
