/**
 * @file Transactional emails for manual account suspension and restoration.
 * Used by admin server actions — moderation auto-bans use templates in ./templates/.
 */

import { sendTransactionalEmail } from "./send";
import { buildManualBanEmail, buildManualUnbanEmail } from "./templates";

/**
 * Notify the user when an admin changes account status.
 * Only sends on transitions to/from banned — not when unchanged.
 *
 * @param {object} params
 * @param {string} params.prevStatus
 * @param {string} params.nextStatus
 * @param {string} [params.email]
 * @param {string} [params.ownerName]
 * @param {string} [params.locale]
 * @param {string} [params.reason] - Shown in ban emails when provided
 */
export async function notifyManualStatusChange({
  prevStatus,
  nextStatus,
  email,
  ownerName,
  locale = "en",
  reason,
}) {
  if (!email) return;

  const wasBanned = prevStatus === "banned";
  const banned = nextStatus === "banned";

  if (banned && !wasBanned) {
    await sendTransactionalEmail({
      to: email,
      logTag: "account-status",
      build: () =>
        buildManualBanEmail({
          ownerName,
          locale,
          reason: reason?.trim() || undefined,
        }),
    });
    return;
  }

  if (!banned && wasBanned) {
    await sendTransactionalEmail({
      to: email,
      logTag: "account-status",
      build: () => buildManualUnbanEmail({ ownerName, locale }),
    });
  }
}
