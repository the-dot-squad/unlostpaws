import { pruneOrphanUploads } from "@/lib/storage/cleanup";
import { withCronJob } from "@/lib/api/cron";

export const maxDuration = 300;

/** Daily cleanup of unattached uploaded files. Called by cron scheduler. */
export async function GET(request) {
  return withCronJob(request, async () => pruneOrphanUploads({ maxAgeHours: 24 }));
}
