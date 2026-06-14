"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import "@/app/cookie-consent.css";
import { routing } from "@/i18n/routing";
import { isRtlLocale } from "@/config/locales";
import { buildConsentConfig, hasAnalyticsConsent } from "@/lib/consent";
import { GtmLoader } from "./gtm-loader";

function localeFromPathname(pathname) {
  const segment = pathname.split("/")[1];
  return routing.locales.includes(segment) ? segment : routing.defaultLocale;
}

/**
 * Initializes CookieConsent, syncs locale, and gates GTM behind analytics consent.
 */
export function CookieConsentManager() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await CookieConsent.run({
        ...buildConsentConfig(locale),
        onConsent: () => {
          if (!cancelled) setAnalyticsEnabled(hasAnalyticsConsent());
        },
        onChange: () => {
          if (!cancelled) setAnalyticsEnabled(hasAnalyticsConsent());
        },
      });

      if (!cancelled) {
        const root = document.getElementById("cc-main");
        if (root) {
          root.dir = isRtlLocale(locale) ? "rtl" : "ltr";
        }
        setAnalyticsEnabled(hasAnalyticsConsent());
        setReady(true);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; locale updates via setLanguage
  }, []);

  useEffect(() => {
    if (!ready) return;
    CookieConsent.setLanguage(locale, true);

    const root = document.getElementById("cc-main");
    if (root) {
      root.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    }
  }, [locale, ready]);

  return analyticsEnabled ? <GtmLoader /> : null;
}
