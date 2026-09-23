import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getAuthUserById } from "@/lib/auth/users";
import { ProfileForm } from "@/components/account/profile-form";
import { toPlainObject } from "@/lib/utils";

export default async function SettingsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const session = await getSession();
  const user = await getAuthUserById(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.profile")}</h1>
        <p className="mt-1 text-muted-foreground">{t("account.profile.subtitle")}</p>
      </div>
      <ProfileForm user={toPlainObject(user || session.user)} />
    </div>
  );
}
