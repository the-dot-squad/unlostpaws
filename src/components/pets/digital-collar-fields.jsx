"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MAX_NOTE } from "@/config/constants/field-limits";

/**
 * Digital Collar settings block for pet create/edit forms.
 */
export function DigitalCollarFields({ locale, premium, value, onChange }) {
  const t = useTranslations("myPets.digitalCollar");

  function update(field, next) {
    onChange({ ...value, [field]: next });
  }

  if (!premium) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed bg-muted/20 p-4">
        <div className="flex items-start gap-2">
          <QrCode className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="text-sm text-muted-foreground">{t("upsellBody")}</p>
            <Link
              href={`/${locale}/account/premium`}
              className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("upsellCta")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="digital-collar-enabled" className="text-sm font-medium">
            {t("title")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <Switch
          id="digital-collar-enabled"
          checked={Boolean(value.enabled)}
          onCheckedChange={(checked) => update("enabled", checked)}
        />
      </div>

      {value.enabled ? (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="medical-alerts">{t("medicalAlerts")}</Label>
            <Textarea
              id="medical-alerts"
              value={value.medicalAlerts || ""}
              onChange={(e) => update("medicalAlerts", e.target.value)}
              rows={3}
              maxLength={MAX_NOTE}
              placeholder={t("medicalAlertsPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("medicalAlertsHint")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("contactHint")}</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="collar-email"
                checked={Boolean(value.allowEmail)}
                onCheckedChange={(v) => update("allowEmail", !!v)}
              />
              <Label htmlFor="collar-email" className="font-normal">
                {t("allowEmail")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="collar-phone"
                checked={Boolean(value.allowPhone)}
                onCheckedChange={(v) => update("allowPhone", !!v)}
              />
              <Label htmlFor="collar-phone" className="font-normal">
                {t("allowPhone")}
              </Label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
