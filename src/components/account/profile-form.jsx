"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountrySelect } from "@/components/form/country-select";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { PhoneField } from "@/components/account/phone-field";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { signOut } from "@/lib/auth/client";
import { deleteMyAccount, updateProfile } from "@/lib/actions/profile";
import { isPremium, showsVerifiedBadge } from "@/lib/premium/entitlements";
import { userPath } from "@/lib/paths";
import { MAX_CITY, MAX_NAME, MAX_USERNAME } from "@/config/constants/field-limits";

const PROFILE_ERROR_KEYS = {
  invalid_phone: "account.profile.errors.invalid_phone",
  invalid_country: "account.profile.errors.invalid_country",
  invalid_username: "account.profile.errors.invalid_username",
  reserved_username: "account.profile.errors.reserved_username",
  username_already_taken: "account.profile.errors.username_already_taken",
  only_premium_can_set_username: "account.profile.errors.only_premium_can_set_username",
  use_phone_verify_flow: "account.profile.errors.use_phone_verify_flow",
  phone_change_cooldown: "account.profile.errors.phone_change_cooldown",
  invalid_input: "account.profile.errors.invalid_input",
  not_found: "account.profile.errors.not_found",
};

/**
 * Profile settings form — name, avatar, contact, language, location, and verified handle.
 */
export function ProfileForm({ user }) {
  const t = useTranslations();
  const router = useRouter();
  const currentLocale = useLocale();

  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.handle?.username || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [locale, setLocale] = useState(user.locale || currentLocale);
  const [country, setCountry] = useState(user.country || "");
  const [city, setCity] = useState(user.city || "");
  const [image, setImage] = useState(user.image || "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const premium = isPremium(user);
  const publicVerified = showsVerifiedBadge(user);
  const savedUsername = user.handle?.username;
  const publicId = user.handle?.publicId || user.publicId || "";
  const profileIdentifier = premium && savedUsername ? savedUsername : publicId;
  const profileHandle = profileIdentifier
    ? premium && savedUsername
      ? `@${savedUsername}`
      : `@${publicId}`
    : "";
  const profileHref = profileIdentifier ? userPath(profileIdentifier, currentLocale) : null;

  async function handleSave() {
    setLoading(true);
    const result = await updateProfile({
      name,
      phone: premium && user.phone && user.phoneVerified ? user.phone : phone,
      locale,
      country,
      city,
      image,
      username: premium ? username : undefined,
    });
    setLoading(false);

    if (result.error) {
      const key = PROFILE_ERROR_KEYS[result.error] ?? "account.profile.errors.generic";
      toast.error(t(key));
      return;
    }

    toast.success(t("account.profileUpdated"));

    if (result.locale && result.locale !== currentLocale) {
      router.push(`/${result.locale}/account/settings`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        t("account.profile.deleteAccountConfirm", { email: user.email || "" })
      )
    ) {
      return;
    }

    setDeleting(true);
    const result = await deleteMyAccount();
    setDeleting(false);

    if (result?.error) {
      toast.error(t("account.profile.deleteAccountError"));
      return;
    }

    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(`/${currentLocale}`);
          router.refresh();
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile.photoTitle")}</CardTitle>
          <CardDescription>{t("account.profile.photoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            name={name || user.name}
            imageUrl={image}
            onChange={setImage}
            premium={premium}
            profileHref={profileHref}
            profileHandle={profileHandle}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile.personalTitle")}</CardTitle>
          <CardDescription>{t("account.profile.personalDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex min-h-6 items-center">
                <Label htmlFor="name">{t("account.profile.name")}</Label>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("account.profile.nameHint")}
              </p>
            </div>

            {premium ? (
              <div className="space-y-2">
                <div className="flex min-h-6 items-center justify-between gap-2">
                  <Label htmlFor="username">{t("account.profile.handle")}</Label>
                  {publicVerified ? (
                    <VerifiedBadge size="sm" showLabel label={t("users.verifiedBadge")} />
                  ) : null}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="your_handle"
                    className="ps-7"
                    maxLength={MAX_USERNAME}
                  />
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t("account.profile.handleHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex min-h-6 items-center">
                  <Label>{t("account.profile.publicId")}</Label>
                </div>
                <Input
                  value={user.handle?.publicId || user.publicId || ""}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t("account.profile.publicIdHint")}
                </p>
              </div>
            )}
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex min-h-6 items-center">
                <Label htmlFor="email">{t("account.profile.email")}</Label>
              </div>
              <Input id="email" value={user.email || ""} disabled className="bg-muted/50" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("account.profile.emailHint")}
              </p>
            </div>

            <PhoneField user={user} value={phone} onChange={setPhone} />
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <CountrySelect
              value={country}
              onChange={setCountry}
              label={t("listings.country")}
              id="profile-country"
            />
            <div className="space-y-2">
              <div className="flex min-h-6 items-center">
                <Label htmlFor="city">{t("listings.city")}</Label>
              </div>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={MAX_CITY}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading || deleting}>
            {loading ? t("common.loading") : t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile.preferencesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("account.locale")}</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fa">فارسی</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={loading || deleting}>
            {loading ? t("common.loading") : t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t("account.profile.deleteAccountTitle")}</CardTitle>
          <CardDescription>{t("account.profile.deleteAccountDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={loading || deleting}
          >
            {deleting ? t("common.loading") : t("account.profile.deleteAccountAction")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
