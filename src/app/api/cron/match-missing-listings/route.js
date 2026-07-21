import { reprocessListingMatches } from "@/lib/intelligence/matching/reprocess";
import { withCronJob } from "@/lib/api/cron";

export const maxDuration = 300;

/** Daily re-scan of active listings for cross-type matches. */
export async function GET(request) {
  return withCronJob(request, async () => reprocessListingMatches());
}
