import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, timeZone } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Dynamic import so message file edits are picked up reliably in dev.
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone,
  };
});
