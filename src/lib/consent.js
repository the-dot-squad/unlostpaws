"use client";

import * as CookieConsent from "vanilla-cookieconsent";
import en from "../../messages/en.json";
import fa from "../../messages/fa.json";
import { routing } from "@/i18n/routing";

/** @type {Record<string, typeof en.consent>} */
const CONSENT_MESSAGES = {
  en: en.consent,
  fa: fa.consent,
};

function consentMessagesForLocale(locale) {
  return CONSENT_MESSAGES[locale] ?? CONSENT_MESSAGES.en;
}

function buildLocaleTranslation(locale) {
  const t = consentMessagesForLocale(locale);
  const prefix = `/${locale}`;

  return {
    consentModal: {
      title: t.consentModal.title,
      description: t.consentModal.description,
      acceptAllBtn: t.consentModal.acceptAll,
      acceptNecessaryBtn: t.consentModal.rejectAll,
      showPreferencesBtn: t.consentModal.managePreferences,
      footer: `
        <a href="${prefix}/terms/privacy">${t.consentModal.privacyLink}</a>
        <a href="${prefix}/terms">${t.consentModal.termsLink}</a>
      `,
    },
    preferencesModal: {
      title: t.preferencesModal.title,
      acceptAllBtn: t.preferencesModal.acceptAll,
      acceptNecessaryBtn: t.preferencesModal.rejectAll,
      savePreferencesBtn: t.preferencesModal.save,
      closeIconLabel: t.preferencesModal.close,
      serviceCounterLabel: t.preferencesModal.serviceCounter,
      sections: [
        {
          title: t.preferencesModal.sections.intro.title,
          description: t.preferencesModal.sections.intro.description,
        },
        {
          title: t.preferencesModal.sections.necessary.title,
          description: t.preferencesModal.sections.necessary.description,
          linkedCategory: "necessary",
        },
        {
          title: t.preferencesModal.sections.analytics.title,
          description: t.preferencesModal.sections.analytics.description,
          linkedCategory: "analytics",
        },
        {
          title: t.preferencesModal.sections.moreInfo.title,
          description: t.preferencesModal.sections.moreInfo.description
            .replace("{privacyUrl}", `${prefix}/terms/privacy`)
            .replace("{contactUrl}", `${prefix}/contact`),
        },
      ],
    },
  };
}

/** Build a CookieConsent v3 config for the given locale. */
export function buildConsentConfig(locale) {
  const t = consentMessagesForLocale(locale);

  return {
    mode: "opt-in",
    revision: 1,

    cookie: {
      name: "ulp_cookie_consent",
      expiresAfterDays: 182,
    },

    guiOptions: {
      consentModal: {
        layout: "box",
        position: "bottom right",
        equalWeightButtons: true,
        flipButtons: false,
      },
      preferencesModal: {
        layout: "box",
        equalWeightButtons: true,
        flipButtons: false,
      },
    },

    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      analytics: {
        autoClear: {
          cookies: [{ name: /^_ga/ }, { name: "_gid" }, { name: /^_gat/ }],
          reloadPage: true,
        },
        services: {
          gtm: {
            label: t.services.gtm,
          },
        },
      },
    },

    language: {
      default: locale,
      translations: Object.fromEntries(
        routing.locales.map((code) => [code, buildLocaleTranslation(code)])
      ),
    },
  };
}

/** Whether the user has accepted the analytics category. */
export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;

  try {
    return CookieConsent.acceptedCategory("analytics");
  } catch {
    return false;
  }
}

/** Open the cookie preferences modal. */
export function showCookiePreferences() {
  if (typeof window === "undefined") return;
  CookieConsent.showPreferences();
}
