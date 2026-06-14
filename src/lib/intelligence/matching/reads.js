/** @file Account match list reads. */

import { connectDB } from "@/config/db";
import { attachListingPublicId, Listing } from "@/models/listing";
import { ListingMatch } from "@/models/listing-match";
import { OwnedPet } from "@/models/owned-pet";
import { findListingByPublicId } from "@/lib/public-id";

async function loadListingsMap(ids) {
  const unique = [...new Set(ids.map(String))];
  if (!unique.length) return new Map();

  const listings = await Listing.find({ _id: { $in: unique } }).lean();
  return new Map(listings.map((l) => [String(l._id), attachListingPublicId(l)]));
}

/** Group matches by a listing the user owns. */
export async function getMatchGroupsForUser(userId) {
  await connectDB();

  const matches = await ListingMatch.find({
    $or: [{ listingAUserId: userId }, { listingBUserId: userId }],
  })
    .sort({ finalScore: -1 })
    .lean();

  const ownListingIds = new Set();
  const counterpartIds = new Set();

  for (const match of matches) {
    const isA = match.listingAUserId === userId;
    ownListingIds.add(String(isA ? match.listingAId : match.listingBId));
    counterpartIds.add(String(isA ? match.listingBId : match.listingAId));
  }

  const [ownMap, counterpartMap] = await Promise.all([
    loadListingsMap([...ownListingIds]),
    loadListingsMap([...counterpartIds]),
  ]);

  /** @type {Map<string, { listing: object, matches: object[], pendingCount: number }>} */
  const groups = new Map();

  for (const match of matches) {
    const isA = match.listingAUserId === userId;
    const ownId = String(isA ? match.listingAId : match.listingBId);
    const otherId = String(isA ? match.listingBId : match.listingAId);

    const listing = ownMap.get(ownId);
    if (!listing) continue;

    if (!groups.has(ownId)) {
      groups.set(ownId, { listing, matches: [], pendingCount: 0 });
    }

    const group = groups.get(ownId);
    group.matches.push({
      ...match,
      counterpartListing: counterpartMap.get(otherId) ?? null,
    });

    if (
      listing.type === "missing" &&
      match.tier === "reunification" &&
      (match.status === "pending" || match.status === "notified")
    ) {
      group.pendingCount += 1;
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount || b.matches.length - a.matches.length
  );
}

export async function getAccountDashboardData(userId) {
  await connectDB();

  const [listingsCount, petsCount, matchGroups] = await Promise.all([
    Listing.countDocuments({ userId }),
    OwnedPet.countDocuments({ userId, status: "active" }),
    getMatchGroupsForUser(userId),
  ]);

  const totalMatches = matchGroups.reduce((sum, g) => sum + g.matches.length, 0);
  const pendingMatches = matchGroups.reduce((sum, g) => sum + g.pendingCount, 0);

  return { listingsCount, petsCount, totalMatches, pendingMatches, matchGroups };
}

export async function getMatchesForListing(userId, listingPublicId) {
  await connectDB();

  const listingModel = await findListingByPublicId(listingPublicId, { userId });
  if (!listingModel) return null;

  const listing = attachListingPublicId(listingModel.toObject());
  const lid = listing._id;

  const matches = await ListingMatch.find({
    $or: [
      { listingAId: lid, listingAUserId: userId },
      { listingBId: lid, listingBUserId: userId },
    ],
  })
    .sort({ finalScore: -1 })
    .lean();

  const otherIds = matches.map((match) => {
    const isA = String(match.listingAId) === String(lid);
    return isA ? match.listingBId : match.listingAId;
  });

  const counterpartMap = await loadListingsMap(otherIds);

  const enriched = matches.map((match) => {
    const isA = String(match.listingAId) === String(lid);
    const otherId = String(isA ? match.listingBId : match.listingAId);
    return {
      ...match,
      counterpartListing: counterpartMap.get(otherId) ?? null,
    };
  });

  return { listing, matches: enriched };
}

export function filterMatches(matches, filter = "active") {
  if (filter === "all") return matches;
  if (filter === "confirmed") return matches.filter((m) => m.status === "confirmed");
  if (filter === "dismissed") return matches.filter((m) => m.status === "dismissed");
  return matches.filter((m) => m.status === "pending" || m.status === "notified");
}

export function getMatchFilterCounts(matches) {
  return {
    all: matches.length,
    active: matches.filter((m) => m.status === "pending" || m.status === "notified").length,
    confirmed: matches.filter((m) => m.status === "confirmed").length,
    dismissed: matches.filter((m) => m.status === "dismissed").length,
  };
}
