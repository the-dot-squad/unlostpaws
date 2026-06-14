"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { publicEnv } from "@/config/public";
import { hasAnalyticsConsent } from "@/lib/consent";

/**
 * Push a custom event to GTM dataLayer. No-op when GTM is not configured or analytics consent is missing.
 * @param {string} name — event name (use `@/config/constants/analytics-events`)
 * @param {Record<string, string | number | boolean | undefined>} [params]
 */
export function trackEvent(name, params = {}) {
  if (!publicEnv.gtmId || !hasAnalyticsConsent()) return;

  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );

  sendGTMEvent({ event: name, ...payload });
}
