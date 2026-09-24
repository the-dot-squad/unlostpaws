/** @file Premium billing — Checkout, Customer Portal, Price sync, subscription → user. */

import "server-only";
import { env } from "@/config/env";
import { connectDB, getMongoDb } from "@/config/db";
import { AppSettings } from "@/models/app-settings";
import {
  getAppSettings,
  invalidateAppSettingsCache,
} from "@/lib/services/settings";
import { authUserIdFilter, getAuthUserById, updateAuthUserById } from "@/lib/auth/users";
import { isPremium } from "@/lib/premium/entitlements";
import { defaultLocale, locales } from "@/i18n/routing";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

const PRODUCT_NAME = "UnLostPaws Premium";
const PRODUCT_DESCRIPTION =
  "Annual Premium membership: Digital Collar QR tags, a verified badge and higher alert limits.";

const ACTIVE_STRIPE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

/**
 * @param {string | undefined | null} locale
 */
export function resolvePremiumLocale(locale) {
  const normalized = String(locale || defaultLocale).trim().toLowerCase();
  return locales.includes(normalized) ? normalized : defaultLocale;
}

/**
 * Map Stripe subscription.status → our premiumStatus.
 * @param {string} stripeStatus
 * @returns {"none" | "active" | "past_due" | "canceled"}
 */
export function mapStripeSubscriptionStatus(stripeStatus) {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

/**
 * @param {import("stripe").Stripe.Subscription} subscription
 * @param {object} settings
 */
function isConfiguredPremiumSubscription(subscription, settings) {
  const priceId = settings.stripePremiumPriceId || "";
  const productId = settings.stripePremiumProductId || "";
  if (!priceId && !productId) return true;

  for (const item of subscription.items?.data || []) {
    const itemPriceId = typeof item.price === "string" ? item.price : item.price?.id;
    const itemProductId =
      typeof item.price === "object" && item.price?.product
        ? typeof item.price.product === "string"
          ? item.price.product
          : item.price.product?.id
        : null;

    if (priceId && itemPriceId === priceId) return true;
    if (productId && itemProductId === productId) return true;
  }

  return false;
}

/**
 * Ensure Stripe Product + annual Price match admin settings; persist IDs on AppSettings.
 * @param {object} [settings]
 */
export async function syncPremiumStripePrice(settings) {
  if (!isStripeConfigured()) return { skipped: true, reason: "stripe_not_configured" };

  const current = settings || (await getAppSettings());
  if (!current.premiumEnabled) return { skipped: true, reason: "premium_disabled" };

  const stripe = getStripe();
  const cents = Number(current.premiumPriceCents) || 2000;
  const currency = String(current.premiumCurrency || "usd").toLowerCase();

  let productId = current.stripePremiumProductId || "";
  if (!productId) {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: PRODUCT_DESCRIPTION,
      metadata: { app: "unlostpaws", plan: "premium" },
    });
    productId = product.id;
  }

  let priceId = current.stripePremiumPriceId || "";
  let needsNewPrice = !priceId;

  if (priceId) {
    try {
      const existing = await stripe.prices.retrieve(priceId);
      if (
        existing.unit_amount !== cents ||
        existing.currency !== currency ||
        existing.recurring?.interval !== "year" ||
        existing.product !== productId
      ) {
        needsNewPrice = true;
      }
    } catch {
      needsNewPrice = true;
    }
  }

  if (needsNewPrice) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: cents,
      currency,
      recurring: { interval: "year" },
      metadata: { app: "unlostpaws", plan: "premium" },
    });
    priceId = price.id;
  }

  if (
    productId !== current.stripePremiumProductId ||
    priceId !== current.stripePremiumPriceId
  ) {
    await connectDB();
    await AppSettings.findOneAndUpdate(
      { singleton: "default" },
      {
        $set: {
          stripePremiumProductId: productId,
          stripePremiumPriceId: priceId,
        },
      },
      { upsert: true }
    );
    invalidateAppSettingsCache();
  }

  return { productId, priceId };
}

/**
 * @param {object} user
 * @returns {Promise<string>} Stripe customer id
 */
export async function ensureStripeCustomer(user) {
  const stripe = getStripe();
  const userId = String(user.id || user._id);

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const refreshed = await getAuthUserById(userId);
  if (refreshed?.stripeCustomerId) return refreshed.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email || refreshed?.email || undefined,
    name: user.name || refreshed?.name || undefined,
    metadata: { userId },
  });

  const db = await getMongoDb();
  const updated = await db.collection("user").findOneAndUpdate(
    {
      $and: [
        authUserIdFilter(userId),
        {
          $or: [
            { stripeCustomerId: { $exists: false } },
            { stripeCustomerId: null },
            { stripeCustomerId: "" },
          ],
        },
      ],
    },
    { $set: { stripeCustomerId: customer.id } },
    { returnDocument: "after" }
  );

  if (updated?.stripeCustomerId) return updated.stripeCustomerId;

  const winner = await getAuthUserById(userId);
  return winner?.stripeCustomerId || customer.id;
}

/**
 * @param {string} customerId
 */
async function customerHasActivePremiumSubscription(customerId) {
  const stripe = getStripe();
  for (const status of ACTIVE_STRIPE_SUBSCRIPTION_STATUSES) {
    const page = await stripe.subscriptions.list({ customer: customerId, status, limit: 5 });
    if (page.data.length > 0) return true;
  }
  return false;
}

/**
 * @param {object} user
 * @param {string} locale
 */
export async function createPremiumCheckoutSession(user, locale) {
  if (!isStripeConfigured()) return { error: "billing_unavailable" };

  const settings = await getAppSettings();
  if (!settings.premiumEnabled) return { error: "premium_disabled" };

  const priceId = settings.stripePremiumPriceId;
  if (!priceId) return { error: "billing_misconfigured" };

  const userId = String(user.id || user._id);
  const customerId = await ensureStripeCustomer(user);

  if (await customerHasActivePremiumSubscription(customerId)) {
    return { error: "already_premium" };
  }

  const stripe = getStripe();
  const safeLocale = resolvePremiumLocale(locale);
  const base = env.app.url.replace(/\/$/, "");
  const localePrefix = `/${safeLocale}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}${localePrefix}/account/premium?checkout=success`,
    cancel_url: `${base}${localePrefix}/account/premium?checkout=canceled`,
    metadata: { userId, plan: "premium" },
    subscription_data: {
      metadata: { userId, plan: "premium" },
    },
  });

  if (!session.url) return { error: "checkout_failed" };
  return { url: session.url };
}

/**
 * @param {object} user
 * @param {string} locale
 */
export async function createPremiumPortalSession(user, locale) {
  if (!isStripeConfigured()) return { error: "billing_unavailable" };
  if (!user.stripeCustomerId) return { error: "no_customer" };

  const stripe = getStripe();
  const safeLocale = resolvePremiumLocale(locale);
  const base = env.app.url.replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${base}/${safeLocale}/account/premium`,
  });

  return { url: session.url };
}

/** @param {string | undefined} customerId */
async function findUserIdByStripeCustomer(customerId) {
  if (!customerId) return null;
  const db = await getMongoDb();
  const user = await db.collection("user").findOne(
    { stripeCustomerId: customerId },
    { projection: { _id: 1, id: 1 } }
  );
  if (!user) return null;
  return user.id || String(user._id);
}

/**
 * Apply subscription state to the matching auth user.
 * @param {import("stripe").Stripe.Subscription} subscription
 * @param {string} [userIdHint]
 */
export async function syncSubscriptionToUser(subscription, userIdHint) {
  const settings = await getAppSettings();

  if (!isConfiguredPremiumSubscription(subscription, settings)) {
    console.warn("[stripe] ignoring subscription with unexpected price/product", subscription.id);
    return;
  }

  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodEndUnix =
    subscription.items?.data?.[0]?.current_period_end ??
    subscription.current_period_end;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const userId =
    userIdHint ||
    subscription.metadata?.userId ||
    (await findUserIdByStripeCustomer(customerId));

  if (!userId) {
    console.error("[stripe] syncSubscriptionToUser: no user for", subscription.id);
    return;
  }

  const existing = await getAuthUserById(userId);
  // Complimentary admin Premium wins — never overwrite with Stripe state.
  if (existing && isPremium(existing) && existing.premiumSource === "admin") {
    const keepStripeIds = {};
    if (customerId) keepStripeIds.stripeCustomerId = customerId;
    if (Object.keys(keepStripeIds).length) {
      await updateAuthUserById(userId, keepStripeIds);
    }
    return;
  }

  /** @type {Record<string, unknown>} */
  const patch = {
    stripeSubscriptionId: subscription.id,
    premiumStatus: status,
    premiumPeriodEnd: periodEnd,
    premiumSource: status === "active" || status === "past_due" ? "stripe" : null,
  };
  if (
    (status === "active" || status === "past_due") &&
    !existing?.premiumStartedAt
  ) {
    const startUnix =
      subscription.items?.data?.[0]?.current_period_start ??
      subscription.current_period_start ??
      subscription.start_date ??
      subscription.created;
    patch.premiumStartedAt = startUnix ? new Date(startUnix * 1000) : new Date();
  }
  if (customerId) patch.stripeCustomerId = customerId;

  await updateAuthUserById(userId, patch);
}

/**
 * @param {import("stripe").Stripe.Checkout.Session} session
 */
export async function handleCheckoutSessionCompleted(session) {
  if (session.mode !== "subscription") return;

  const userId = session.client_reference_id || session.metadata?.userId;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!userId || !subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (customerId) {
    await updateAuthUserById(userId, { stripeCustomerId: customerId });
  }

  await syncSubscriptionToUser(subscription, userId);
}

/**
 * @param {import("stripe").Stripe.Subscription} subscription
 */
export async function handleSubscriptionDeleted(subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const userId =
    subscription.metadata?.userId || (await findUserIdByStripeCustomer(customerId));
  if (!userId) return;

  const existing = await getAuthUserById(userId);
  if (existing && isPremium(existing) && existing.premiumSource === "admin") {
    return;
  }

  if (customerId) {
    const stripe = getStripe();
    for (const status of ["active", "trialing", "past_due"]) {
      const page = await stripe.subscriptions.list({ customer: customerId, status, limit: 10 });
      const replacement = page.data.find((sub) => sub.id !== subscription.id);
      if (replacement) {
        await syncSubscriptionToUser(replacement, userId);
        return;
      }
    }
  }

  await updateAuthUserById(userId, {
    premiumStatus: "canceled",
    premiumSource: null,
    stripeSubscriptionId: subscription.id,
    premiumPeriodEnd: subscription.ended_at
      ? new Date(subscription.ended_at * 1000)
      : new Date(),
  });
}

/** @param {string} userId */
export async function getPremiumContext(userId) {
  const [user, settings] = await Promise.all([
    getAuthUserById(userId),
    getAppSettings(),
  ]);
  return { user, settings };
}
