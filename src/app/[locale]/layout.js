import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale, getMessages, getTimeZone, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { directionForLocale } from "@/config/locales";
import { fontClassForLocale, fontVariableForLocale } from "@/lib/fonts";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { IntlProvider } from "@/components/providers/intl-provider";
import { CookieConsentManager } from "@/components/consent/cookie-consent-manager";
import { Toaster } from "sonner";
import "@/app/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const tSeo = await getTranslations({ locale, namespace: "seo" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const siteName = tCommon("appName");

  return buildPageMetadata({
    locale,
    title: {
      default: `${siteName} — ${tSeo("defaultTitle")}`,
      template: `%s | ${siteName}`,
    },
    description: tSeo("defaultDescription"),
  });
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, timeZone] = await Promise.all([getMessages(), getTimeZone()]);
  const dir = directionForLocale(locale);

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      dir={dir}
      className={`${fontVariableForLocale(locale)} ${fontClassForLocale(locale)} h-full`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
            <div className="flex min-h-full flex-1 flex-col">{children}</div>
            <Toaster richColors position="top-center" />
          </IntlProvider>
        </ThemeProvider>
        <CookieConsentManager />
      </body>
    </html>
  );
}
