/** @file Match notification — group pending matches and email owners. */

import { connectDB } from "@/config/db";
import { Listing, listingPublicId } from "@/models/listing";
import { ListingMatch } from "@/models/listing-match";
import { getAuthUsersByIds } from "@/lib/auth/users";
import { getAppSettings } from "@/lib/services/settings";
import { sendTransactionalEmail } from "@/lib/email";
import { buildCorroborationMatchEmail, buildMatchNotificationEmail } from "@/lib/email/templates";

/**
 * @param {object} params
 * @param {object[]} params.pending
 * @param {object} params.sourceListing
 * @param {import("mongoose").Types.ObjectId|string} params.listingId
 * @param {number} params.highThreshold
 * @param {Map<string, object>} params.listingsMap
 */
export function groupPendingMatchesByUser({
  pending,
  sourceListing,
  listingId,
  highThreshold,
  listingsMap,
}) {
  /** @type {Map<string, { userId: string, matches: object[], matchIds: object[] }>} */
  const byUser = new Map();

  for (const row of pending) {
    const isSourceA = String(row.listingAId) === String(listingId);
    const otherId = isSourceA ? row.listingBId : row.listingAId;
    const otherUserId = isSourceA ? row.listingBUserId : row.listingAUserId;

    const otherListing = listingsMap.get(String(otherId));
    if (!otherListing) continue;

    const notifyUserIds = [];

    if (row.tier === "reunification") {
      const missingUserId =
        sourceListing.type === "missing" ? sourceListing.userId : otherListing.userId;
      notifyUserIds.push(missingUserId);

      if (row.finalScore >= highThreshold) {
        const otherParty =
          sourceListing.userId === missingUserId ? otherListing.userId : sourceListing.userId;
        if (otherParty !== missingUserId) {
          notifyUserIds.push(otherParty);
        }
      }
    } else if (row.finalScore >= highThreshold) {
      notifyUserIds.push(sourceListing.userId, otherUserId);
    }

    for (const uid of new Set(notifyUserIds)) {
      if (!byUser.has(uid)) {
        byUser.set(uid, { userId: uid, matches: [], matchIds: [] });
      }
      const bucket = byUser.get(uid);
      const counterpart = uid === sourceListing.userId ? otherListing : sourceListing;
      bucket.matches.push({
        id: listingPublicId(counterpart),
        title: `${counterpart.petType} — ${counterpart.color}`,
        type: counterpart.type,
        score: row.finalScore,
        tier: row.tier,
      });
      bucket.matchIds.push(row._id);
    }
  }

  return byUser;
}

/**
 * @param {object} params
 */
export async function deliverMatchNotifications({ byUser, sourceListing, pending, usersMap }) {
  for (const { userId, matches, matchIds } of byUser.values()) {
    const owner = usersMap[userId];
    if (!owner?.email) continue;

    const reunification = matches.filter((m) => m.tier === "reunification");
    const corroboration = matches.filter((m) => m.tier === "corroboration");

    if (reunification.length) {
      const missingListing =
        sourceListing.type === "missing" && sourceListing.userId === userId
          ? sourceListing
          : await Listing.findOne({
              userId,
              type: "missing",
              _id: { $in: pending.map((p) => p.listingAId).concat(pending.map((p) => p.listingBId)) },
            }).lean();

      await sendTransactionalEmail({
        to: owner.email,
        logTag: "matches",
        build: () =>
          buildMatchNotificationEmail({
            ownerName: owner.name,
            missingTitle: missingListing
              ? `${missingListing.petType} — ${missingListing.color}`
              : "your pet alert",
            matches: reunification,
            locale: owner.locale || "en",
          }),
      });
    }

    if (corroboration.length) {
      await sendTransactionalEmail({
        to: owner.email,
        logTag: "matches",
        build: () =>
          buildCorroborationMatchEmail({
            ownerName: owner.name,
            matches: corroboration,
            locale: owner.locale || "en",
          }),
      });
    }

    await ListingMatch.updateMany(
      { _id: { $in: matchIds } },
      {
        $set: { status: "notified", notifiedAt: new Date() },
        $addToSet: { notifiedUserIds: userId },
      }
    );
  }
}

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
