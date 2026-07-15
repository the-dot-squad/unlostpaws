import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, timeZone } from "./routing";
import en from "../../messages/en.json";
import fa from "../../messages/fa.json";

const messages = { en, fa };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messages[locale],
    timeZone,
  };
});
