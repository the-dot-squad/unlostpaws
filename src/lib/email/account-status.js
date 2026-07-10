/**
 * @file Transactional emails for manual account suspension and restoration.
 * Used by admin server actions — moderation auto-bans use templates in ./templates/.
 */

import { sendTransactionalEmail } from "./send";
import { buildManualBanEmail, buildManualUnbanEmail } from "./templates";

/**
 * Notify the user when an admin changes ban status (ban or unban).
 * Only sends on transitions — not when the flag is unchanged.
 *
 * @param {object} params
 * @param {boolean} params.wasBanned
 * @param {boolean} params.banned
 * @param {string} [params.email]
 * @param {string} [params.ownerName]
 * @param {string} [params.locale]
 * @param {string} [params.reason] - Shown in ban emails when provided
 */
export async function notifyManualBanStatusChange({
  wasBanned,
  banned,
  email,
  ownerName,
  locale = "en",
  reason,
}) {
  if (!email) return;

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
