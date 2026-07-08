import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { ListingMatch } from "@/models/listing-match";
import { getAuthUsersByIds } from "@/lib/auth/users";
import { getAppSettings } from "@/lib/services/settings";
import { deliverMatchNotifications, groupPendingMatchesByUser } from "./notify-delivery";

/**
 * Notify listing owners about new cross-type matches involving their listing.
 *
 * @param {Object} params
 * @param {import("mongoose").Types.ObjectId|string} params.listingId
 */
export async function notifyListingMatches({ listingId }) {
  await connectDB();
  const settings = await getAppSettings();
  const highThreshold = settings.matchConfidenceHighThreshold ?? 0.9;

  const pending = await ListingMatch.find({
    sourceListingId: listingId,
    status: "pending",
  })
    .sort({ finalScore: -1 })
    .limit(10)
    .lean();

  if (!pending.length) {
    return;
  }

  const sourceListing = await Listing.findById(listingId).lean();
  if (!sourceListing) {
    return;
  }

  const otherIds = pending.map((row) => {
    const isSourceA = String(row.listingAId) === String(listingId);
    return isSourceA ? row.listingBId : row.listingAId;
  });
  const uniqueOtherIds = [...new Set(otherIds.map((id) => String(id)))];
  const otherListings = await Listing.find({ _id: { $in: uniqueOtherIds } }).lean();
  const listingsMap = new Map(otherListings.map((l) => [l._id.toString(), l]));

  const byUser = groupPendingMatchesByUser({
    pending,
    sourceListing,
    listingId,
    highThreshold,
    listingsMap,
  });

  const usersMap = await getAuthUsersByIds(Array.from(byUser.keys()));

  await deliverMatchNotifications({
    byUser,
    sourceListing,
    pending,
    usersMap,
  });
}
