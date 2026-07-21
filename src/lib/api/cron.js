/** @file Shared helpers for cron API routes. */

import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { rejectInvalidBearer } from "@/lib/request-metadata";

/**
 * Wrap a cron handler with bearer auth and consistent error responses.
 * @template T
 * @param {Request} request
 * @param {(request: Request) => Promise<T>} handler
 */
export async function withCronJob(request, handler) {
  const unauthorized = rejectInvalidBearer(request, env.cron.secret);
  if (unauthorized) return unauthorized;

  try {
    const result = await handler(request);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
