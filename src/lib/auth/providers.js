/** @file OAuth provider discovery and Better Auth social provider config. */

import { env } from "@/config/env";

/** @typedef {"google" | "microsoft" | "facebook" | "twitter"} OAuthProviderId */

/** @type {{ id: OAuthProviderId, label: string }[]} */
export const OAUTH_PROVIDER_DEFS = [
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X" },
];

/** @type {Record<OAuthProviderId, { clientId: string; clientSecret: string; tenantId?: string; prompt?: string }>} */
const OAUTH_CREDENTIALS = {
  google: env.auth.google,
  microsoft: env.auth.microsoft,
  facebook: env.auth.facebook,
  twitter: env.auth.twitter,
};

function isProviderConfigured(id) {
  const creds = OAUTH_CREDENTIALS[id];
  return Boolean(creds.clientId && creds.clientSecret);
}

/** @returns {OAuthProviderId[]} */
export function getConfiguredOAuthProviderIds() {
  return OAUTH_PROVIDER_DEFS.filter(({ id }) => isProviderConfigured(id)).map(({ id }) => id);
}

/** @returns {Record<string, object>} */
export function buildSocialProviders() {
  const socialProviders = {};

  if (isProviderConfigured("google")) {
    socialProviders.google = {
      clientId: OAUTH_CREDENTIALS.google.clientId,
      clientSecret: OAUTH_CREDENTIALS.google.clientSecret,
      prompt: "select_account",
    };
  }

  if (isProviderConfigured("microsoft")) {
    socialProviders.microsoft = {
      clientId: OAUTH_CREDENTIALS.microsoft.clientId,
      clientSecret: OAUTH_CREDENTIALS.microsoft.clientSecret,
      tenantId: OAUTH_CREDENTIALS.microsoft.tenantId || "common",
      prompt: "select_account",
      mapProfileToUser: () => ({ image: null }),
    };
  }

  if (isProviderConfigured("facebook")) {
    socialProviders.facebook = {
      clientId: OAUTH_CREDENTIALS.facebook.clientId,
      clientSecret: OAUTH_CREDENTIALS.facebook.clientSecret,
    };
  }

  if (isProviderConfigured("twitter")) {
    socialProviders.twitter = {
      clientId: OAUTH_CREDENTIALS.twitter.clientId,
      clientSecret: OAUTH_CREDENTIALS.twitter.clientSecret,
    };
  }

  return socialProviders;
}
