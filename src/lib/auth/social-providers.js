import { env } from "@/config/env";

/** @returns {Record<string, object>} */
export function buildSocialProviders() {
  const socialProviders = {};

  if (env.auth.google.clientId && env.auth.google.clientSecret) {
    socialProviders.google = {
      clientId: env.auth.google.clientId,
      clientSecret: env.auth.google.clientSecret,
      prompt: "select_account",
    };
  }

  if (env.auth.facebook.clientId && env.auth.facebook.clientSecret) {
    socialProviders.facebook = {
      clientId: env.auth.facebook.clientId,
      clientSecret: env.auth.facebook.clientSecret,
    };
  }

  if (env.auth.twitter.clientId && env.auth.twitter.clientSecret) {
    socialProviders.twitter = {
      clientId: env.auth.twitter.clientId,
      clientSecret: env.auth.twitter.clientSecret,
    };
  }

  return socialProviders;
}
