/** @file Business logic for user-submitted listing moderation reports. */

import { ModerationReport } from "@/models/moderation-report";
import { findListingByPublicId } from "@/lib/public-id";
import { requireActiveSession } from "@/lib/auth/session";
import { getRequestMetadata } from "@/lib/request-metadata";
import { checkReportRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { reportReceivedEmail } from "@/lib/email/templates";
import { maybeAutoReviewListing } from "@/lib/moderation/auto-review";

/**
 * File a moderation report against a listing.
 * Requires an authenticated session — one report per user per listing, ever.
 *
 * @param {object} input
 * @param {string} input.listingId Listing public hashid from the URL
 * @param {string} input.reason
 * @param {string} [input.details]
 * @returns {Promise<{ ok: true } | { ok: false, status: number, error: string }>}
 */
export async function submitListingReport({ listingId, reason, details }) {
  let session;
  try {
    session = await requireActiveSession();
  } catch {
    return { ok: false, status: 401, error: "auth_required" };
  }

  const listing = await findListingByPublicId(listingId);
  if (!listing || listing.status === "removed") {
    return { ok: false, status: 404, error: "not_found" };
  }

  if (session.user.id === listing.userId) {
    return { ok: false, status: 400, error: "self_report" };
  }

  const reporterId = session.user.id;

  // One report per user per listing — regardless of prior resolution status.
  const existing = await ModerationReport.findOne({ listingId, reporterId });
  if (existing) {
    return { ok: false, status: 409, error: "already_reported" };
  }

  const rateLimit = await checkReportRateLimit(reporterId);
  if (!rateLimit.allowed) {
    return { ok: false, status: 403, error: rateLimit.error };
  }

  const { clientIp, userAgent } = await getRequestMetadata();

  await ModerationReport.create({
    listingId: listing._id,
    reporterId,
    reason,
    details: details || "",
    status: "open",
    clientIp,
    userAgent,
    auditLog: [{ action: "report_submitted", by: reporterId }],
  });

  listing.reportCount = (listing.reportCount || 0) + 1;
  await listing.save();

  await maybeAutoReviewListing(listing._id, reason);

  if (session.user.email) {
    const email = reportReceivedEmail({ reporterName: session.user.name });
    await sendEmail({ to: session.user.email, ...email }).catch(() => {});
  }

  return { ok: true };
}
