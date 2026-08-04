import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getConfiguredOAuthProviderIds } from "@/lib/auth/providers";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent } from "@/components/ui/card";
import { SiteContainer } from "@/components/layout/site-container";
import { AppLogo } from "@/components/layout/app-logo";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    locale,
    title: t("signInTitle"),
    description: t("signInDescription"),
    path: "login",
    noIndex: true,
  });
}

export default async function SignInPage({ params, searchParams }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await getSession();
  const status = session?.user?.status || (session?.user?.banned ? "banned" : "active");
  if (session && status === "active") redirect(`/${locale}/account`);

  const t = await getTranslations();
  const providerIds = getConfiguredOAuthProviderIds();
  const error = sp?.error || null;

  return (
    <SiteContainer className="flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-4xl overflow-hidden shadow-lg">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center bg-primary/5 p-8 md:p-10">
            <AppLogo size="lg" className="rounded-2xl" />
            <h1 className="mt-6 text-2xl font-bold">{t("auth.welcomeBack")}</h1>
            <p className="mt-2 text-muted-foreground">{t("auth.brandPanelSubtitle")}</p>
          </div>

          <CardContent className="flex flex-col justify-center gap-6 p-8 md:p-10">
            <div className="text-center md:text-start">
              <h2 className="text-xl font-semibold">{t("auth.signInTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>
            </div>
            <SignInForm locale={locale} providerIds={providerIds} error={error} />
          </CardContent>
        </div>
      </Card>
    </SiteContainer>
  );
}
