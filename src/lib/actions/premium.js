/** @file Premium subscription server actions — Checkout + Customer Portal. */
"use server";

import { withAuthAction } from "@/lib/auth/session";
import { getAuthUserById } from "@/lib/auth/users";
import { isPremium } from "@/lib/premium/entitlements";
import {
  createPremiumCheckoutSession,
  createPremiumPortalSession,
} from "@/lib/stripe/premium";

/**
 * Start Stripe Checkout for annual Premium.
 * @param {string} locale
 */
export async function startPremiumCheckout(locale) {
  return withAuthAction("startPremiumCheckout", async (session) => {
    const user = await getAuthUserById(session.user.id);
    if (!user) return { error: "user_not_found" };

    if (isPremium(user)) {
      return { error: "already_premium" };
    }

    const result = await createPremiumCheckoutSession(user, locale || "en");
    if (result.error) return { error: result.error };
    return { url: result.url };
  });
}

/**
 * Open Stripe Customer Portal to manage / cancel billing.
 * @param {string} locale
 */
export async function openPremiumBillingPortal(locale) {
  return withAuthAction("openPremiumBillingPortal", async (session) => {
    const user = await getAuthUserById(session.user.id);
    if (!user) return { error: "user_not_found" };

    const result = await createPremiumPortalSession(user, locale || "en");
    if (result.error) return { error: result.error };
    return { url: result.url };
  });
}
