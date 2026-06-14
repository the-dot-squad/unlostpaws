import { getTranslations } from "next-intl/server";
import { requireActiveSessionPage } from "@/lib/auth/session";
import { SiteContainer } from "@/components/layout/site-container";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { buildPageMetadata } from "@/lib/seo/metadata";

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

  return (
    <SiteContainer className="py-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <AccountSidebar locale={locale} user={session.user} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SiteContainer>
  );
}
