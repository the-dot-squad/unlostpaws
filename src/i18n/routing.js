import { defineRouting } from "next-intl/routing";

export const timeZone = "UTC";

/** Supported site locales — single source of truth for i18n routing. */
export const locales = ["en", "fa"];

export const defaultLocale = "en";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
