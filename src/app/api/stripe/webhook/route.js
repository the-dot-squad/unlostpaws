/** @file Stripe webhook — subscription lifecycle → premiumStatus on user. */

import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionDeleted,
  syncSubscriptionToUser,
} from "@/lib/stripe/premium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isStripeConfigured() || !env.stripe.webhookSecret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.stripe.webhookSecret);
  } catch (err) {
    console.error("[stripe.webhook] signature verification failed", err?.message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscriptionToUser(event.data.object);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToUser(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe.webhook] handler error", event.type, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
