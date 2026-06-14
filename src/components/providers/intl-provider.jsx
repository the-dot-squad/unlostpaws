"use client";

import { NextIntlClientProvider } from "next-intl";

export function IntlProvider({ children, locale, messages, timeZone }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
