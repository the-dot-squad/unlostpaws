/** @file Auth user lookups, ID normalization, and linked OAuth accounts. */

import { ObjectId } from "mongodb";
import { getMongoDb } from "@/config/db";
import { getAuth } from "./index";

const PROVIDER_LABELS = {
  google: "Google",
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

/** Attach a stable `id` field for admin UI and links. */
export function normalizeAuthUser(user) {
  if (!user) return null;
  const id = getAuthUserId(user);
  return { ...user, id };
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
  return ctx.internalAdapter.findUserById(userId);
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
      name: 1,
      email: 1,
      banned: 1,
      confirmedViolationCount: 1,
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
 */
export async function updateAuthUserById(userId, data) {
  const auth = await getAuth();
  const ctx = await auth.$context;
  return ctx.internalAdapter.updateUser(userId, data);
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
