/** @file Server-side session helpers — request guards and session revocation. */

import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMongoDb } from "@/config/db";
import { getAuth } from "./index";

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/** Active signed-in user — throws when missing or banned. */
export async function requireActiveSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (session.user.banned) {
    throw new Error("BANNED");
  }
  return session;
}

/** Admin or moderator — staff moderation access. */
export async function requireStaff() {
  const session = await requireActiveSession();
  if (session.user.role !== "admin" && session.user.role !== "moderator") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/** Platform admin only — settings, users, purge, CMS. */
export async function requireAdmin() {
  const session = await requireActiveSession();
  if (session.user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Page guard — redirect unauthenticated or banned users to sign-in.
 * @param {string} locale
 */
export async function requireActiveSessionPage(locale) {
  const session = await getSession();
  if (session?.user?.banned) {
    redirect(`/${locale}/sign-in?error=user_banned`);
  }
  if (!session) {
    redirect(`/${locale}/sign-in`);
  }
  return session;
}

/**
 * Map auth errors from {@link requireActiveSession} to action results.
 * @param {unknown} err
 * @returns {{ error: string } | null}
 */
export function authActionError(err) {
  if (!(err instanceof Error)) return null;
  if (err.message === "UNAUTHORIZED") return { error: "unauthorized" };
  if (err.message === "BANNED") return { error: "banned" };
  if (err.message === "FORBIDDEN") return { error: "forbidden" };
  return null;
}

/**
 * Remove every active session for a user.
 * Called when an account is suspended so existing cookies stop working immediately.
 *
 * @param {string} userId - better-auth user id (string or ObjectId-compatible)
 */
export async function revokeUserSessions(userId) {
  const db = await getMongoDb();
  const userIdClauses = [{ userId }];
  if (ObjectId.isValid(userId)) {
    userIdClauses.push({ userId: new ObjectId(userId) });
  }
  await db.collection("session").deleteMany({ $or: userIdClauses });
}
