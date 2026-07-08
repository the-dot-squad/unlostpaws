import { connectDB, getMongoDb } from "@/config/db";
import { attachListingPublicId, Listing } from "@/models/listing";
import { ModerationReport } from "@/models/moderation-report";
import { ListingMatch } from "@/models/listing-match";
import { OwnedPet } from "@/models/owned-pet";
import {
  countOpenReportCases,
  getOpenReportStatsByListingIds,
  getRecentOpenReportCases,
} from "@/lib/moderation/report-cases";
import {
  RECENT_LISTING_LIMIT,
  RECENT_REPORT_LIMIT,
  sevenDaysAgo,
  startOfTodayUtc,
} from "./helpers";

async function fetchDashboardCounts(db, today, weekAgo) {
  return Promise.all([
    db.collection("user").countDocuments(),
    Listing.countDocuments(),
    Listing.countDocuments({ status: "active" }),
    Listing.countDocuments({ status: "under_review" }),
    Listing.countDocuments({ status: "resolved" }),
    Listing.countDocuments({ createdAt: { $gte: today } }),
    Listing.countDocuments({ createdAt: { $gte: weekAgo } }),
    countOpenReportCases(),
    ModerationReport.countDocuments(),
    ListingMatch.countDocuments({ status: "notified" }),
    ListingMatch.countDocuments({ status: "pending" }),
    ListingMatch.countDocuments({ status: "confirmed" }),
    OwnedPet.countDocuments({ status: "active" }),
    Listing.countDocuments({ processingStatus: "failed" }),
    OwnedPet.countDocuments({ processingStatus: "failed" }),
    Listing.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ModerationReport.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.find()
      .sort({ createdAt: -1 })
      .limit(RECENT_LISTING_LIMIT)
      .select("petType color type status reportCount createdAt")
      .lean(),
    getRecentOpenReportCases(RECENT_REPORT_LIMIT),
  ]);
}

function buildAttentionItems({
  openReports,
  underReviewListings,
  pendingMatches,
  failedProcessing,
}) {
  return [
    openReports > 0 && {
      key: "reports",
      label: "Open report cases",
      count: openReports,
      href: "/admin/reports",
    },
    underReviewListings > 0 && {
      key: "review",
      label: "Listings under review",
      count: underReviewListings,
      href: "/admin/listings?status=under_review",
    },
    pendingMatches > 0 && {
      key: "matches",
      label: "Pending AI matches",
      count: pendingMatches,
      href: "/admin/matches",
    },
    failedProcessing > 0 && {
      key: "ml-failed",
      label: "Failed ML processing",
      count: failedProcessing,
      href: "/admin/stats#processing",
    },
  ].filter(Boolean);
}

/** Operational payload for /admin home. */
export async function getDashboardStats() {
  await connectDB();
  const db = await getMongoDb();
  const today = startOfTodayUtc();
  const weekAgo = sevenDaysAgo();

  const [
    totalUsers,
    totalListings,
    activeListings,
    underReviewListings,
    resolvedListings,
    listingsToday,
    listingsThisWeek,
    openReports,
    totalReports,
    matchesSent,
    pendingMatches,
    confirmedMatches,
    registeredPets,
    failedProcessingListings,
    failedProcessingPets,
    listingsByType,
    listingsByStatus,
    reportsByReason,
    recentListings,
    recentReports,
  ] = await fetchDashboardCounts(db, today, weekAgo);

  const recentListingOpenStats = await getOpenReportStatsByListingIds(
    recentListings.map((l) => l._id)
  );
  const recentListingsWithReports = recentListings.map((l) =>
    attachListingPublicId({
      ...l,
      ...(recentListingOpenStats[String(l._id)] ?? { openReportCount: 0, openCaseCount: 0 }),
    })
  );

  const failedProcessing = failedProcessingListings + failedProcessingPets;

  return {
    attention: buildAttentionItems({
      openReports,
      underReviewListings,
      pendingMatches,
      failedProcessing,
    }),
    users: { total: totalUsers },
    listings: {
      total: totalListings,
      active: activeListings,
      underReview: underReviewListings,
      resolved: resolvedListings,
      today: listingsToday,
      thisWeek: listingsThisWeek,
      byType: listingsByType,
      byStatus: listingsByStatus,
      recent: recentListingsWithReports,
    },
    reports: {
      open: openReports,
      total: totalReports,
      byReason: reportsByReason,
      recent: recentReports,
    },
    matches: { sent: matchesSent, pending: pendingMatches, confirmed: confirmedMatches },
    pets: { active: registeredPets },
    processing: { failed: failedProcessing },
  };
}
