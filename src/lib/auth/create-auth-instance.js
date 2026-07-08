import { betterAuth } from "better-auth/minimal";
import { createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { encodeUserPublicId } from "@/lib/public-id";
import { buildSocialProviders } from "./social-providers";

/** @param {import("mongodb").Db} db */
export function createAuthInstance(db) {
  return betterAuth({
    baseURL: env.app.url,
    secret: env.auth.secret,
    database: mongodbAdapter(db, { client: db.client }),
    socialProviders: buildSocialProviders(),
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
}
