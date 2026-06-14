import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { ProfileForm } from "@/components/account/profile-form";

export default async function SettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.profile")}</h1>
        <p className="mt-1 text-muted-foreground">{t("account.profile.subtitle")}</p>
      </div>
      <ProfileForm user={session.user} />
    </div>
  );
}
