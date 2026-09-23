/** @file Auth user lookups, ID normalization, and linked OAuth accounts. */

import { ObjectId } from "mongodb";
import { getMongoDb } from "@/config/db";
import { getAuth } from "./index";
import { revokeUserSessions } from "./session";

const PROVIDER_LABELS = {
  google: "Google",
  microsoft: "Microsoft",
  facebook: "Facebook",
  twitter: "Twitter",
  github: "GitHub",
  apple: "Apple",
};

/**
 * better-auth users in MongoDB use `_id` as the canonical id (no separate `id` field).
 * Session APIs expose it as `user.id` — normalize raw documents the same way.
 */
export function getAuthUserId(user) {
  if (!user) return null;
  if (user.id) return String(user.id);
  if (user._id) return String(user._id);
  return null;
}

/** Normalize handle whether stored as a JSON string, an object, or plain string. */
export function normalizeUserHandle(handle, fallbackPublicId = "") {
  if (!handle) {
    return { username: "", publicId: fallbackPublicId || "" };
  }
  if (typeof handle === "string") {
    try {
      const parsed = JSON.parse(handle);
      if (parsed && typeof parsed === "object") {
        return {
          username: String(parsed.username || "").trim().toLowerCase().replace(/^@/, ""),
          publicId: String(parsed.publicId || fallbackPublicId || ""),
        };
      }
    } catch {
      return {
        username: handle.trim().toLowerCase().replace(/^@/, ""),
        publicId: fallbackPublicId || "",
      };
    }
  }
  if (typeof handle === "object") {
    return {
      username: String(handle.username || "").trim().toLowerCase().replace(/^@/, ""),
      publicId: String(handle.publicId || fallbackPublicId || ""),
    };
  }
  return { username: "", publicId: fallbackPublicId || "" };
}

/** Attach a stable `id` field for admin UI and links, and normalize handle. */
export function normalizeAuthUser(user) {
  if (!user) return null;
  const id = getAuthUserId(user);
  const rawPublicId = user.publicId || "";
  const handle = normalizeUserHandle(user.handle, rawPublicId || id);
  return {
    ...user,
    id,
    handle,
    publicId: rawPublicId || handle.publicId || id,
  };
}

/**
 * Build a MongoDB filter to find a user by session-style id.
 * @param {string} userId
 */
export function authUserIdFilter(userId) {
  const clauses = [{ _id: userId }, { id: userId }];

  if (ObjectId.isValid(userId)) {
    clauses.push({ _id: new ObjectId(userId) });
  }

  return { $or: clauses };
}

/**
 * Fetch a user by ID via better-auth internal adapter.
 * Replaces auth.api.getUser which is only available with the admin plugin.
 */
export async function getAuthUserById(userId) {
  const auth = await getAuth();
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.findUserById(userId);
  return user ? normalizeAuthUser(user) : null;
}

/**
 * Batch-fetch users by id for admin tables (reporters, owners, etc.).
 * @param {string[]} userIds
 * @returns {Promise<Record<string, ReturnType<typeof normalizeAuthUser>>>}
 */
export async function getAuthUsersByIds(userIds) {
  const unique = [...new Set(userIds.filter((id) => id && id !== "system"))];
  if (!unique.length) return {};

  const db = await getMongoDb();
  const objectIds = unique.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const orClauses = [
    { _id: { $in: unique } },
    { id: { $in: unique } },
  ];
  if (objectIds.length) orClauses.push({ _id: { $in: objectIds } });

  const users = await db
    .collection("user")
    .find({ $or: orClauses })
    .project({
      _id: 1,
      id: 1,
      publicId: 1,
      handle: 1,
      premiumStatus: 1,
      premiumPeriodEnd: 1,
      premiumSource: 1,
      phone: 1,
      phoneVerified: 1,
      name: 1,
      email: 1,
      status: 1,
      banned: 1,
      quota: 1,
    })
    .toArray();

  const map = {};
  for (const raw of users) {
    const user = normalizeAuthUser(raw);
    map[user.id] = user;
    if (raw._id) map[String(raw._id)] = user;
    if (user.id !== String(raw._id)) map[String(raw._id)] = user;
  }
  return map;
}

/**
 * Update a user by ID via better-auth internal adapter.
 * Revokes active sessions when account status transitions away from active.
 */
export async function updateAuthUserById(userId, data) {
  const auth = await getAuth();
  const ctx = await auth.$context;

  const existing = await ctx.internalAdapter.findUserById(userId);
  const prevStatus = existing?.status || (existing?.banned ? "banned" : "active");

  let nextStatus = prevStatus;
  if (data.status !== undefined) {
    nextStatus = data.status;
  } else if (data.banned === true) {
    nextStatus = "banned";
  } else if (data.banned === false && prevStatus === "banned") {
    nextStatus = "active";
  }

  const result = await ctx.internalAdapter.updateUser(userId, data);

  if (prevStatus === "active" && nextStatus !== "active") {
    await revokeUserSessions(userId);
  }

  return result;
}


/** Delete auth user plus linked sessions and OAuth accounts. */
export async function deleteAuthUserById(userId) {
  const auth = await getAuth();
  const ctx = await auth.$context;
  await ctx.internalAdapter.deleteUser(userId);
}

/**
 * Linked OAuth accounts for a user (from better-auth `account` collection).
 * @param {string} userId
 */
export async function getUserLinkedAccounts(userId) {
  const db = await getMongoDb();
  // better-auth mongo adapter stores `userId` as ObjectId (references user `_id`).
  const userIdClauses = [{ userId }];
  if (ObjectId.isValid(userId)) {
    userIdClauses.push({ userId: new ObjectId(userId) });
  }
  const accounts = await db
    .collection("account")
    .find({ $or: userIdClauses })
    .project({ providerId: 1, accountId: 1, createdAt: 1 })
    .toArray();

  return accounts.map((a) => ({
    providerId: a.providerId,
    label: PROVIDER_LABELS[a.providerId] || a.providerId,
    accountId: a.accountId,
    linkedAt: a.createdAt,
  }));
}
