import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { reprocessListingMatches } from "@/lib/intelligence/matching/reprocess";
import { rejectInvalidBearer } from "@/lib/request-metadata";

export const maxDuration = 300;

/** Daily re-scan of active listings for cross-type matches. */
export async function GET(request) {
  const unauthorized = rejectInvalidBearer(request, env.cron.secret);
  if (unauthorized) return unauthorized;

  const result = await reprocessListingMatches();

  return NextResponse.json(result);
}
