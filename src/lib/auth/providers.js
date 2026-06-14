/** @file OAuth provider discovery — only expose providers with credentials configured. */

import { env } from "@/config/env";

/** @typedef {"google" | "facebook" | "twitter"} OAuthProviderId */

/** @type {{ id: OAuthProviderId, label: string }[]} */
export const OAUTH_PROVIDER_DEFS = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X" },
];

/** @returns {OAuthProviderId[]} */
export function getConfiguredOAuthProviderIds() {
  /** @type {OAuthProviderId[]} */
  const ids = [];
  if (env.auth.google.clientId && env.auth.google.clientSecret) ids.push("google");
  if (env.auth.facebook.clientId && env.auth.facebook.clientSecret) ids.push("facebook");
  if (env.auth.twitter.clientId && env.auth.twitter.clientSecret) ids.push("twitter");
  return ids;
}
