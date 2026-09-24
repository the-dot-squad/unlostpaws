import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { getAuthUserById } from "@/lib/auth/users";
import { hasConfirmedAge } from "@/lib/auth/age";
import { AgeConfirmForm } from "@/components/auth/age-confirm-form";
import { AuthAnalyticsBeacon } from "@/components/analytics/auth-analytics-beacon";
import { SiteContainer } from "@/components/layout/site-container";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { toPlainObject } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "age" });

  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "age",
    noIndex: true,
  });
}

export default async function AgeConfirmPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireActiveSessionPage(locale);
  const user = await getAuthUserById(session.user.id);

  if (hasConfirmedAge(user)) {
    redirect(`/${locale}/account`);
  }

  return (
    <SiteContainer className="flex min-h-[70vh] items-center justify-center py-12">
      <AuthAnalyticsBeacon createdAt={toPlainObject(user)?.createdAt} />
      <AgeConfirmForm />
    </SiteContainer>
  );
}
