"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleIcon, MicrosoftIcon, FacebookIcon, XIcon } from "./provider-icons";
import { ANALYTICS_EVENTS } from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

const PROVIDER_META = {
  google: { label: "Google", Icon: GoogleIcon },
  microsoft: { label: "Microsoft", Icon: MicrosoftIcon },
  facebook: { label: "Facebook", Icon: FacebookIcon },
  twitter: { label: "X", Icon: XIcon },
};

/**
 * @param {object} props
 * @param {string} props.locale
 * @param {("google" | "microsoft" | "facebook" | "twitter")[]} props.providerIds
 */
export function SignInForm({ locale, providerIds, error }) {
  const t = useTranslations("auth");
  const prefix = `/${locale}`;

  if (!providerIds.length) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("noProviders")}</AlertDescription>
      </Alert>
    );
  }

  const knownErrors = [
    "access_denied",
    "configuration_error",
    "invalid_credentials",
    "session_expired",
    "unauthorized",
    "user_banned",
  ];
  const errorKey = error && knownErrors.includes(error) ? `errors.${error}` : "errors.generic";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertDescription>{t(errorKey)}</AlertDescription>
        </Alert>
      )}

      {providerIds.map((id) => {
        const meta = PROVIDER_META[id];
        if (!meta) return null;
        const { label, Icon } = meta;

        return (
          <Button
            key={id}
            variant="outline"
            className="h-11 w-full justify-start gap-3"
            onClick={() => {
              trackEvent(ANALYTICS_EVENTS.SIGN_IN_CLICK, { provider: id });
              authClient.signIn.social({
                provider: id,
                callbackURL: `${prefix}/account`,
              });
            }}
          >
            <Icon className="size-5 shrink-0" />
            {t("continueWith", { provider: label })}
          </Button>
        );
      })}

      <Alert variant="muted" className="text-center">
        <AlertDescription>
          {t.rich("termsNotice", {
            terms: (chunks) => (
              <Link href={`${prefix}/terms`} className="font-medium text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href={`${prefix}/terms/privacy`} className="font-medium text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </AlertDescription>
      </Alert>
    </div>
  );
}
