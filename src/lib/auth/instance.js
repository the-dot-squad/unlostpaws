/**
 * @file better-auth server instance factory.
 * Configures OAuth, user fields, and hooks that enforce account suspension.
 */

import { betterAuth } from "better-auth/minimal";
import { createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { defaultLocale } from "@/i18n/routing";
import { encodeUserPublicId } from "@/lib/public-id";
import { buildSocialProviders } from "./providers";

/**
 * Build a locale-aware login redirect for auth hook errors.
 *
 * @param {import("better-auth").MiddlewareContext} ctx
 * @param {string} error - Query param value for SignInForm (`errors.${error}`)
 * @param {string} [locale]
 */
function redirectToLogin(ctx, error, locale = defaultLocale) {
  throw ctx.redirect(`/${locale}/login?error=${error}`);
}

/**
 * Create the better-auth instance bound to a MongoDB database.
 *
 * @param {import("mongodb").Db} db
 */
export function createAuthInstance(db) {
  return betterAuth({
    baseURL: env.app.url,
    secret: env.auth.secret,
    database: mongodbAdapter(db, { client: db.client }),
    socialProviders: buildSocialProviders(),
    errorURL: `/${defaultLocale}/login`,
    disabledPaths: ["/sign-up/email", "/login/email"],
    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: false },
        phoneVerified: { type: "boolean", required: false, defaultValue: false, input: false },
        phoneVerifiedAt: { type: "date", required: false, input: false },
        phoneChangedAt: { type: "date", required: false, input: false },
        phoneOtp: { type: "json", required: false, input: false },
        country: { type: "string", required: false, input: false },
        city: { type: "string", required: false, input: false },
        role: { type: "string", required: false, defaultValue: "user", input: false },
        locale: { type: "string", required: false, defaultValue: "en", input: false },
        listingLimitOverride: { type: "number", required: false, input: false },
        status: { type: "string", required: false, defaultValue: "active", input: false },
        quota: { type: "json", required: false, input: false },
        publicId: { type: "string", required: false, input: false },
        handle: { type: "json", required: false, input: false },
        stripeCustomerId: { type: "string", required: false, input: false },
        stripeSubscriptionId: { type: "string", required: false, input: false },
        premiumStatus: { type: "string", required: false, defaultValue: "none", input: false },
        premiumPeriodEnd: { type: "date", required: false, input: false },
        premiumStartedAt: { type: "date", required: false, input: false },
        premiumSource: { type: "string", required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const _id = user._id
              ? new ObjectId(user._id)
              : user.id
                ? new ObjectId(user.id)
                : new ObjectId();

            const publicId = user.publicId || encodeUserPublicId(_id);

            return {
              data: {
                ...user,
                _id,
                id: _id.toString(),
                role: "user",
                status: "active",
                phoneVerified: false,
                phoneVerifiedAt: null,
                phoneChangedAt: null,
                phoneOtp: null,
                premiumStatus: "none",
                premiumSource: null,
                premiumPeriodEnd: null,
                premiumStartedAt: null,
                quota: {
                  listing: {
                    today: 0,
                    thisMonth: 0,
                    todayReset: null,
                    monthReset: null,
                  },
                  violation: 0,
                },
                publicId,
                handle: user.handle || {
                  username: "",
                  publicId,
                },
              },
            };
          },
        },
      },
    },
    plugins: [nextCookies()],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/error") {
          const error = ctx.query.error || "generic";
          redirectToLogin(ctx, error);
        }
      }),
      /**
       * Discard sessions created for suspended accounts (e.g. OAuth callback).
       * Admin bans also revoke sessions via {@link revokeUserSessions} in session.js;
       * this hook covers sign-in attempts after a ban is already in place.
       */
      after: createAuthMiddleware(async (ctx) => {
        const newSession = ctx.context.newSession;
        const status = newSession?.user?.status || (newSession?.user?.banned ? "banned" : "active");
        if (status === "active") return;

        const userId = newSession.user.id;
        if (userId) {
          const { revokeUserSessions } = await import("./session");
          await revokeUserSessions(userId);
        }

        const locale = newSession.user.locale || defaultLocale;
        redirectToLogin(ctx, `user_${status}`, locale);
      }),
    },
    experimental: { joins: true },
  });
}
