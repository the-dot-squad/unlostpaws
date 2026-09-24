"use client";

import { Analytics } from "@vercel/analytics/next";
import { hasAnalyticsConsent } from "@/lib/consent";

/** Vercel Web Analytics — page views only; gated by analytics cookie consent. */
export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => (hasAnalyticsConsent() ? event : null)}
    />
  );
}
