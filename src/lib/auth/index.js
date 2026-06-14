/** @file better-auth server configuration — use {@link ./session} for request guards. */

import { betterAuth } from "better-auth/minimal";
import { createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/config/env";
import { getMongoDb } from "@/config/db";
import { ObjectId } from "mongodb";
import { encodeUserPublicId } from "@/lib/public-id";

let authInstance = null;

export async function getAuth() {
  if (authInstance) return authInstance;

  const db = await getMongoDb();

  const socialProviders = {};

  if (env.auth.google.clientId && env.auth.google.clientSecret) {
    socialProviders.google = {
      clientId: env.auth.google.clientId,
      clientSecret: env.auth.google.clientSecret,
      prompt: "select_account",
    };
  }

  if (env.auth.facebook.clientId && env.auth.facebook.clientSecret) {
    socialProviders.facebook = {
      clientId: env.auth.facebook.clientId,
      clientSecret: env.auth.facebook.clientSecret,
    };
  }

  if (env.auth.twitter.clientId && env.auth.twitter.clientSecret) {
    socialProviders.twitter = {
      clientId: env.auth.twitter.clientId,
      clientSecret: env.auth.twitter.clientSecret,
    };
  }

  authInstance = betterAuth({
    baseURL: env.app.url,
    secret: env.auth.secret,
    database: mongodbAdapter(db, { client: db.client }),
    socialProviders,
    errorURL: "/sign-in",
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
          throw ctx.redirect(`/sign-in?error=${error}`);
        }
      }),
    },
    experimental: { joins: true },
  });

  return authInstance;
}
