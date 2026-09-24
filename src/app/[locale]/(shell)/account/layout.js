import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { getAuthUserById } from "@/lib/auth/users";
import { hasConfirmedAge } from "@/lib/auth/age";
import { SiteContainer } from "@/components/layout/site-container";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { AuthAnalyticsBeacon } from "@/components/analytics/auth-analytics-beacon";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { toPlainObject } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    locale,
    title: t("accountTitle"),
    description: t("defaultDescription"),
    path: "account",
    noIndex: true,
  });
}

export default async function AccountLayout({ children, params }) {
  const { locale } = await params;
  const session = await requireActiveSessionPage(locale);
  const authUser = await getAuthUserById(session.user.id);

  if (!hasConfirmedAge(authUser)) {
    redirect(`/${locale}/age`);
  }

  const sidebarUser = toPlainObject(authUser || session.user);

  return (
    <SiteContainer className="py-8">
      <AuthAnalyticsBeacon
        createdAt={sidebarUser?.createdAt}
        ageConfirmedAt={sidebarUser?.ageConfirmedAt}
      />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <AccountSidebar locale={locale} user={sidebarUser} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SiteContainer>
  );
}
