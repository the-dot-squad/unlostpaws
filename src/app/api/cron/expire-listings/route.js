import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { syncListingImageStatusBulk } from "@/lib/intelligence";
import { rejectInvalidBearer } from "@/lib/request-metadata";

export const maxDuration = 120;

/** Expire listings past their expiresAt date. Called by cron scheduler. */
export async function GET(request) {
  const unauthorized = rejectInvalidBearer(request, env.cron.secret);
  if (unauthorized) return unauthorized;

  await connectDB();

  const now = new Date();
  const expired = await Listing.find({
    status: "active",
    expiresAt: { $lt: now },
  }).select("_id");

  if (!expired.length) {
    return NextResponse.json({ expired: 0 });
  }

  const ids = expired.map((l) => l._id);
  await Listing.updateMany({ _id: { $in: ids } }, { $set: { status: "expired" } });
  await syncListingImageStatusBulk(ids, "expired");

  return NextResponse.json({ expired: ids.length });
}
