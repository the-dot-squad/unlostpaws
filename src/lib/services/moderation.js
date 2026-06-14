/** @file Moderation case resolution business logic. */

import { REPORT_CASE_ACTIONS } from "@/config/constants/enums";
import { setListingStatus } from "@/lib/listings/status";
import {
  deleteListingCompletely,
  softRemoveListing,
} from "@/lib/listings/purge-listing";
import { getOpenCaseReports } from "@/lib/moderation/report-cases";
import { recordConfirmedViolation } from "@/lib/moderation/violations";
import { getAppSettings } from "@/lib/services/settings";
import { Listing } from "@/models/listing";
import { ModerationReport } from "@/models/moderation-report";

/**
 * Resolve all open reports in a moderation case.
 *
 * @param {object} params
 * @param {string} params.listingId
 * @param {string} params.reason
 * @param {string} params.action
 * @param {string} [params.note]
 * @param {string} params.adminUserId
 * @returns {Promise<{ success: true, ownerUserId: string | null } | { error: string }>}
 */
export async function resolveReportCase({
  listingId,
  reason,
  action,
  note,
  adminUserId,
}) {
  if (!REPORT_CASE_ACTIONS.includes(action)) {
    return { error: "Invalid action" };
  }

  const openReports = await getOpenCaseReports(listingId, reason);
  if (!openReports.length) {
    return { error: "No open reports in this case" };
  }

  const settings = await getAppSettings();
  let listing = await Listing.findById(listingId);
  const ownerUserId = listing?.userId ?? null;
  const finalStatus = action === "dismiss" ? "dismissed" : "resolved";
  const now = new Date();

  async function resolveOpenReports() {
    for (const report of openReports) {
      report.status = finalStatus;
      report.resolution = action;
      report.assignedTo = adminUserId;
      report.auditLog.push({
        action,
        by: adminUserId,
        note: note || "",
        at: now,
      });
      await report.save();
    }
  }

  if (listing && action === "remove_listing") {
    await softRemoveListing(listing, { reason, note, silent: false });
    await resolveOpenReports();
    listing = await Listing.findById(listingId);
  } else if (listing && action === "purge_listing") {
    await deleteListingCompletely(listing);
    await resolveOpenReports();
    listing = null;
  } else {
    await resolveOpenReports();
    if (listing && action === "confirm_violation") {
      await recordConfirmedViolation(ownerUserId, { listing, reason, note, settings });
    }
  }

  if (listing?.status === "under_review") {
    const remainingOpen = await ModerationReport.countDocuments({
      listingId,
      status: { $in: ["open", "reviewing"] },
    });

    if (remainingOpen === 0 && action === "dismiss") {
      await setListingStatus(listing, "active");
    }
  }

  return { success: true, ownerUserId };
}
