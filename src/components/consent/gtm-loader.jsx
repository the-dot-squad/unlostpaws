"use client";

import { GoogleTagManager } from "@next/third-parties/google";
import { publicEnv } from "@/config/public";

/** Loads GTM only after analytics consent has been granted. */
export function GtmLoader() {
  if (!publicEnv.gtmId) return null;
  return <GoogleTagManager gtmId={publicEnv.gtmId} />;
}
