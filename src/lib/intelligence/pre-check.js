import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { getAppSettings } from "@/lib/services/settings";
import { descriptionOverlap } from "@/lib/intelligence/matching/metadata-score";

/**
 * Cheap pre-ML gate — flag likely same-user reposts before enqueueing worker.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.petType
 * @param {string} params.color
 * @param {number} params.lng
 * @param {number} params.lat
 */
export async function preCheckListingRepost({ userId, petType, color, lng, lat }) {
  await connectDB();
  const settings = await getAppSettings();
  const lookbackDays = settings.sameUserRepostLookbackDays ?? 30;
  const since = new Date(Date.now() - lookbackDays * 86400000);

  const prior = await Listing.find({
    userId,
    petType,
    color,
    createdAt: { $gte: since },
    status: { $in: ["active", "under_review"] },
    "location.coordinates": {
      $geoWithin: {
        $centerSphere: [[lng, lat], 5 / 6378.1],
      },
    },
  })
    .select("_id description")
    .limit(5)
    .lean();

  if (!prior.length) {
    return { suspectedRepost: false };
  }

  return {
    suspectedRepost: true,
    priorListingIds: prior.map((p) => p._id),
  };
}

/**
 * @param {string} description
 * @param {string} userId
 */
export async function preCheckDescriptionOverlap(description, userId) {
  if (!description?.trim()) {
    return false;
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const prior = await Listing.find({
    userId,
    createdAt: { $gte: weekAgo },
    description: { $exists: true, $ne: "" },
  })
    .select("description")
    .limit(10)
    .lean();

  return prior.some((p) => descriptionOverlap({ description }, p) >= 0.8);
}
