"use client";

import { useEffect } from "react";
import {
  ANALYTICS_EVENTS,
  PURCHASE_FIRED_KEY,
} from "@/config/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Fires purchase once when returning from Stripe Checkout with an active Premium.
 *
 * @param {object} props
 * @param {boolean} props.premium
 * @param {string | null} props.checkout
 * @param {string} props.currency
 * @param {number} props.value
 */
export function PremiumPurchaseBeacon({ premium, checkout, currency, value }) {
  useEffect(() => {
    if (checkout !== "success" || !premium) return;

    try {
      if (sessionStorage.getItem(PURCHASE_FIRED_KEY) === "1") return;
      sessionStorage.setItem(PURCHASE_FIRED_KEY, "1");
    } catch {
      // still fire once this mount if storage is blocked
    }

    trackEvent(ANALYTICS_EVENTS.PURCHASE, {
      currency: currency.toLowerCase(),
      value,
      item_id: "premium",
    });
  }, [premium, checkout, currency, value]);

  return null;
}
