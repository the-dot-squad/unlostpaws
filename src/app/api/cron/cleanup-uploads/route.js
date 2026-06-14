import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { pruneOrphanUploads } from "@/lib/storage/cleanup";
import { rejectInvalidBearer } from "@/lib/request-metadata";

export const maxDuration = 300;

/** Daily cleanup of unattached uploaded files. Called by cron scheduler. */
export async function GET(request) {
  const unauthorized = rejectInvalidBearer(request, env.cron.secret);
  if (unauthorized) return unauthorized;

  try {
    const result = await pruneOrphanUploads({ maxAgeHours: 24 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Cron cleanup-uploads failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
