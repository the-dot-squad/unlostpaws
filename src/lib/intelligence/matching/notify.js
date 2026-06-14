import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { ListingMatch } from "@/models/listing-match";
import { getAuthUserById } from "@/lib/auth/users";
import { listingPublicId } from "@/models/listing";
import { sendEmail } from "@/lib/email";
import { matchNotificationEmail, corroborationMatchEmail } from "@/lib/email/templates";
import { getAppSettings } from "@/lib/services/settings";

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

  /** @type {Map<string, { userId: string, matches: object[], matchIds: object[] }>} */
  const byUser = new Map();

  for (const row of pending) {
    const isSourceA = String(row.listingAId) === String(listingId);
    const otherId = isSourceA ? row.listingBId : row.listingAId;
    const otherUserId = isSourceA ? row.listingBUserId : row.listingAUserId;

    const otherListing = await Listing.findById(otherId).lean();
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

    for (const uid of [...new Set(notifyUserIds)]) {
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

  for (const { userId, matches, matchIds } of byUser.values()) {
    const owner = await getAuthUserById(userId);
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

      const email = matchNotificationEmail({
        ownerName: owner.name,
        missingTitle: missingListing
          ? `${missingListing.petType} — ${missingListing.color}`
          : "your pet alert",
        matches: reunification,
        locale: owner.locale || "en",
      });

      try {
        await sendEmail({ to: owner.email, ...email });
      } catch (err) {
        console.error("Reunification match email failed:", err.message);
      }
    }

    if (corroboration.length) {
      const email = corroborationMatchEmail({
        ownerName: owner.name,
        matches: corroboration,
        locale: owner.locale || "en",
      });

      try {
        await sendEmail({ to: owner.email, ...email });
      } catch (err) {
        console.error("Corroboration match email failed:", err.message);
      }
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
