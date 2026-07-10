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
import { buildSocialProviders } from "./social-providers";

/**
 * Build a locale-aware sign-in redirect for auth hook errors.
 *
 * @param {import("better-auth").MiddlewareContext} ctx
 * @param {string} error - Query param value for SignInForm (`errors.${error}`)
 * @param {string} [locale]
 */
function redirectToSignIn(ctx, error, locale = defaultLocale) {
  throw ctx.redirect(`/${locale}/sign-in?error=${error}`);
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
    errorURL: `/${defaultLocale}/sign-in`,
    disabledPaths: ["/sign-up/email", "/sign-in/email"],
    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: true },
        country: { type: "string", required: false, input: true },
        city: { type: "string", required: false, input: true },
        role: { type: "string", required: false, defaultValue: "user", input: false },
        locale: { type: "string", required: false, defaultValue: "en", input: true },
        listingsToday: { type: "number", required: false, defaultValue: 0, input: false },
        listingsThisMonth: { type: "number", required: false, defaultValue: 0, input: false },
        listingsTodayReset: { type: "date", required: false, input: false },
        listingsMonthReset: { type: "date", required: false, input: false },
        listingLimitOverride: { type: "number", required: false, input: false },
        banned: { type: "boolean", required: false, defaultValue: false, input: false },
        confirmedViolationCount: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
        publicId: { type: "string", required: false, input: false },
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

            return {
              data: {
                ...user,
                _id,
                id: _id.toString(),
                role: "user",
                banned: false,
                publicId: user.publicId || encodeUserPublicId(_id),
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
          redirectToSignIn(ctx, error);
        }
      }),
      /**
       * Discard sessions created for suspended accounts (e.g. OAuth callback).
       * Admin bans also revoke sessions via {@link revokeUserSessions} in session.js;
       * this hook covers sign-in attempts after a ban is already in place.
       */
      after: createAuthMiddleware(async (ctx) => {
        const newSession = ctx.context.newSession;
        if (!newSession?.user?.banned) return;

        const userId = newSession.user.id;
        if (userId) {
          const { revokeUserSessions } = await import("./session");
          await revokeUserSessions(userId);
        }

        const locale = newSession.user.locale || defaultLocale;
        redirectToSignIn(ctx, "user_banned", locale);
      }),
    },
    experimental: { joins: true },
  });
}
