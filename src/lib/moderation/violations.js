/**
 * Confirmed violation strikes — escalates from warning email to account suspension.
 *
 * One upheld case = one strike, regardless of how many users reported it.
 */

import { getAuthUserById, updateAuthUserById } from "@/lib/auth/users";
import { sendEmail } from "@/lib/email";
import { userModerationBanEmail, userModerationWarningEmail } from "@/lib/email/templates";

/**
 * Record a confirmed violation against a listing owner and escalate if needed.
 *
 * @param {string} userId
 * @param {object} ctx
 * @param {import("@/models/listing").Listing} ctx.listing
 * @param {string} ctx.reason
 * @param {string} [ctx.note]
 * @param {import("@/models/app-settings").AppSettings} ctx.settings
 */
export async function recordConfirmedViolation(
  userId,
  { listing, reason, note, settings, silent = false }
) {
  const owner = await getAuthUserById(userId);
  if (!owner) return { strikes: 0, banned: false };

  const previousStrikes = owner.confirmedViolationCount ?? 0;
  const strikes = previousStrikes + 1;
  const threshold = settings.confirmedViolationBanThreshold ?? 3;

  const listingTitle = listing
    ? `${listing.petType} — ${listing.color}`
    : "your listing";

  async function sendModerationEmail(buildEmail) {
    if (!owner.email) return;
    const email = await buildEmail();
    await sendEmail({ to: owner.email, ...email }).catch(() => {});
  }

  const banned = strikes >= threshold;
  await updateAuthUserById(userId, {
    confirmedViolationCount: strikes,
    ...(banned ? { banned: true } : {}),
  });

  if (banned) {
    await sendModerationEmail(() =>
      userModerationBanEmail({
        ownerName: owner.name,
        listingTitle,
        reason,
        note,
        strikes,
        threshold,
        locale: owner.locale || "en",
      })
    );

    return { strikes, banned: true, threshold };
  }

  if (!silent) {
    await sendModerationEmail(() =>
      userModerationWarningEmail({
        ownerName: owner.name,
        listingTitle,
        reason,
        note,
        strikes,
        threshold,
        locale: owner.locale || "en",
      })
    );
  }

  return { strikes, banned: false, threshold };
}
