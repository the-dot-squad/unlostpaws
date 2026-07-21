import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { syncListingImageStatusBulk } from "@/lib/intelligence";
import { withCronJob } from "@/lib/api/cron";

export const maxDuration = 120;

/** Expire listings past their expiresAt date. Called by cron scheduler. */
export async function GET(request) {
  return withCronJob(request, async () => {
    await connectDB();

    const now = new Date();
    const expired = await Listing.find({
      status: "active",
      expiresAt: { $lt: now },
    }).select("_id");

    if (!expired.length) {
      return { expired: 0 };
    }

    const ids = expired.map((l) => l._id);
    await Listing.updateMany({ _id: { $in: ids } }, { $set: { status: "expired" } });
    await syncListingImageStatusBulk(ids, "expired");

    return { expired: ids.length };
  });
}
