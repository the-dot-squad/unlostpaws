/** @file Server-side session helpers — request guards and session revocation. */

import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMongoDb } from "@/config/db";
import { routing } from "@/i18n/routing";
import { isStaffRole } from "@/lib/auth/ban";
import { getAuth } from "./index";

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Normalize account status from session user fields.
 * @param {{ status?: string; banned?: boolean } | null | undefined} user
 */
export function resolveUserStatus(user) {
  if (!user) return "inactive";
  return user.status || (user.banned ? "banned" : "active");
}

/** @param {{ status?: string; banned?: boolean } | null | undefined} user */
export function isActiveUser(user) {
  return resolveUserStatus(user) === "active";
}

/** Active signed-in user — throws when missing or banned. */
export async function requireActiveSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  const status = resolveUserStatus(session.user);
  if (status !== "active") {
    if (status === "banned") throw new Error("BANNED");
    if (status === "deactivated") throw new Error("DEACTIVATED");
    if (status === "deleted") throw new Error("DELETED");
    throw new Error("INACTIVE");
  }
  return session;
}

/** Admin or moderator — staff moderation access. */
export async function requireStaff() {
  const session = await requireActiveSession();
  if (!isStaffRole(session.user.role)) {
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
  if (session?.user) {
    const status = resolveUserStatus(session.user);
    if (status !== "active") {
      redirect(`/${locale}/sign-in?error=user_${status}`);
    }
  }
  if (!session) {
    redirect(`/${locale}/sign-in`);
  }
  return session;
}

/** Page guard — redirect non-staff users to sign-in. */
export async function requireStaffPage() {
  const session = await getSession();
  const locale = session?.user?.locale || routing.defaultLocale;

  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }

  const status = resolveUserStatus(session.user);
  if (status !== "active") {
    redirect(`/${locale}/sign-in?error=user_${status}`);
  }

  if (!isStaffRole(session.user.role)) {
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
  if (err.message === "DEACTIVATED") return { error: "deactivated" };
  if (err.message === "DELETED") return { error: "deleted" };
  if (err.message === "FORBIDDEN") return { error: "forbidden" };
  return null;
}

/**
 * @template T
 * @param {string} label
 * @param {() => Promise<unknown>} guard
 * @param {(guardResult: unknown) => Promise<T>} handler
 * @param {{ rethrow?: boolean; error?: string }} [options]
 */
async function runGuardedAction(label, guard, handler, { rethrow = true, error = "internal_error" } = {}) {
  try {
    const guardResult = await guard();
    return await handler(guardResult);
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    console.error(`${label} failed:`, err);
    if (rethrow) throw err;
    return { error };
  }
}

/**
 * Wrap a server action with active-session auth and shared error handling.
 * @template T
 * @param {string} label
 * @param {(session: Awaited<ReturnType<typeof requireActiveSession>>) => Promise<T>} handler
 * @param {{ rethrow?: boolean; error?: string }} [options]
 */
export function withAuthAction(label, handler, options) {
  return runGuardedAction(label, requireActiveSession, handler, options);
}

/**
 * Wrap a staff-only server action with shared error handling.
 * @template T
 * @param {string} label
 * @param {(session: Awaited<ReturnType<typeof requireStaff>>) => Promise<T>} handler
 * @param {{ rethrow?: boolean; error?: string }} [options]
 */
export function withStaffAction(label, handler, options) {
  return runGuardedAction(label, requireStaff, handler, options);
}

/**
 * Wrap an admin-only server action with shared error handling.
 * @template T
 * @param {string} label
 * @param {(session: Awaited<ReturnType<typeof requireAdmin>>) => Promise<T>} handler
 * @param {{ rethrow?: boolean; error?: string }} [options]
 */
export function withAdminAction(label, handler, options) {
  return runGuardedAction(label, requireAdmin, handler, options);
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
