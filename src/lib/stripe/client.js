/** @file Stripe SDK singleton — only instantiate when keys are configured. */

import "server-only";
import Stripe from "stripe";
import { env } from "@/config/env";

/** @type {Stripe | null} */
let stripeClient = null;

/** @returns {Stripe} */
export function getStripe() {
  if (!env.stripe.configured) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return stripeClient;
}

export function isStripeConfigured() {
  return env.stripe.configured;
}
