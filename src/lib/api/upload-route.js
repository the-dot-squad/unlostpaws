/** @file Shared helpers for authenticated upload API routes. */

import { NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import { getSession, isActiveUser } from "@/lib/auth/session";
import { rejectCrossSiteRequest } from "@/lib/request-metadata";

/**
 * Reject cross-site requests, connect DB, and require an active session.
 * @returns {Promise<{ session: NonNullable<Awaited<ReturnType<typeof getSession>>> } | NextResponse>}
 */
export async function requireActiveSessionForApi(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  await connectDB();

  const session = await getSession();
  if (!session || !isActiveUser(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { session };
}

/**
 * Track a pending upload in the Upload collection.
 * @param {object} params
 */
export async function trackPendingUpload({ key, url, userId, prefix }) {
  const { Upload } = await import("@/models/upload");
  await Upload.create({
    key,
    url,
    userId,
    prefix,
    status: "pending",
  });
}

/**
 * Upsert a pending upload record after a direct PUT upload.
 * @param {object} params
 */
export async function upsertPendingUpload({ key, url, userId, prefix }) {
  const { Upload } = await import("@/models/upload");
  await Upload.findOneAndUpdate(
    { key },
    { key, url, userId, prefix, status: "pending" },
    { upsert: true, new: true }
  );
}
