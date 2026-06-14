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
import { Separator } from "@/components/ui/separator";
import { CountrySelect } from "@/components/form/country-select";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { signOut } from "@/lib/auth/client";
import { deleteMyAccount, updateProfile } from "@/lib/actions/profile";

/**
 * Profile settings form — name, avatar, contact, language, and location.
 */
export function ProfileForm({ user }) {
  const t = useTranslations();
  const router = useRouter();
  const currentLocale = useLocale();

  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [locale, setLocale] = useState(user.locale || currentLocale);
  const [country, setCountry] = useState(user.country || "");
  const [city, setCity] = useState(user.city || "");
  const [image, setImage] = useState(user.image || "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setLoading(true);
    const result = await updateProfile({ name, phone, locale, country, city, image });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t("account.profileUpdated"));

    // Switch site locale when the user changes their preferred language.
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

    if (result?.success) {
      toast.success(t("account.profile.deleteAccountSuccess"));
      await signOut();
      router.push(`/${currentLocale}`);
      router.refresh();
      return;
    }

    toast.error(result?.error ?? t("account.profile.deleteAccountError"));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile.photoTitle")}</CardTitle>
          <CardDescription>{t("account.profile.photoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload name={name} imageUrl={image} onChange={setImage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile.personalTitle")}</CardTitle>
          <CardDescription>{t("account.profile.personalDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("account.profile.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("account.profile.email")}</Label>
            <Input id="email" value={user.email || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">{t("account.profile.emailHint")}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="phone">{t("account.phone")}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
            />
            <p className="text-xs text-muted-foreground">{t("account.phoneHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.profile.locationTitle")}</CardTitle>
          <CardDescription>{t("account.profile.locationDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CountrySelect
            value={country}
            onChange={setCountry}
            label={t("listings.country")}
            id="profile-country"
          />
          <div className="space-y-2">
            <Label htmlFor="city">{t("listings.city")}</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
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
