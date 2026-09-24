"use client";

import { useEffect } from "react";
import {
  AGE_CONFIRM_FIRED_KEY,
  ANALYTICS_EVENTS,
  AUTH_INTENT_STORAGE_KEY,
} from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

const SIGN_UP_WINDOW_MS = 15 * 60 * 1000;
const AGE_CONFIRM_WINDOW_MS = 5 * 60 * 1000;

/**
 * Fires login / sign_up after OAuth redirect, and age_confirm when age was just confirmed.
 *
 * @param {object} props
 * @param {string | Date | null | undefined} [props.createdAt]
 * @param {string | Date | null | undefined} [props.ageConfirmedAt]
 */
export function AuthAnalyticsBeacon({ createdAt, ageConfirmedAt }) {
  useEffect(() => {
    try {
      const method = sessionStorage.getItem(AUTH_INTENT_STORAGE_KEY);
      if (method) {
        sessionStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
        const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
        const isNew =
          Number.isFinite(createdMs) && Date.now() - createdMs < SIGN_UP_WINDOW_MS;
        trackEvent(isNew ? ANALYTICS_EVENTS.SIGN_UP : ANALYTICS_EVENTS.LOGIN, {
          method,
        });
      }

      if (!ageConfirmedAt) return;
      const ageMs = new Date(ageConfirmedAt).getTime();
      if (!Number.isFinite(ageMs) || Date.now() - ageMs > AGE_CONFIRM_WINDOW_MS) return;
      if (sessionStorage.getItem(AGE_CONFIRM_FIRED_KEY) === "1") return;
      sessionStorage.setItem(AGE_CONFIRM_FIRED_KEY, "1");
      trackEvent(ANALYTICS_EVENTS.AGE_CONFIRM);
    } catch {
      // sessionStorage unavailable
    }
  }, [createdAt, ageConfirmedAt]);

  return null;
}
