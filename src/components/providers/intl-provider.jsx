"use client";

import { NextIntlClientProvider } from "next-intl";
import { DirectionProvider } from "@radix-ui/react-direction";
import { directionForLocale } from "@/config/locales";

export function IntlProvider({ children, locale, messages, timeZone }) {
  const dir = directionForLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </NextIntlClientProvider>
  );
}
