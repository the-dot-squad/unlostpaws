/** @file Age confirmation — save month/year DOB or refuse under-13 accounts. */
"use server";

import { redirect } from "next/navigation";
import {
  isAtLeastAge,
  MIN_ACCOUNT_AGE,
  parseBirthMonthYear,
} from "@/lib/auth/age";
import { withAuthAction } from "@/lib/auth/session";
import {
  getAuthUserById,
  getUserLinkedAccounts,
  updateAuthUserById,
} from "@/lib/auth/users";
import { defaultLocale } from "@/i18n/routing";
import { addToBlocklist } from "@/lib/moderation/blocklist";
import { purgeUserAccount } from "@/lib/services/users";

/**
 * Confirm age with month + year only.
 * ≥13 → persist DOB fields and redirect to account;
 * &lt;13 → blocklist + purge, then redirect to login with a clear error.
 *
 * @param {{ birthMonth: number; birthYear: number }} input
 */
export async function confirmAge({ birthMonth, birthYear }) {
  return withAuthAction(
    "confirmAge",
    async (session) => {
      const locale = session.user.locale || defaultLocale;
      const parsed = parseBirthMonthYear(birthMonth, birthYear);
      if (!parsed.ok) {
        return { error: parsed.error };
      }

      const user = await getAuthUserById(session.user.id);
      if (!user) return { error: "unauthorized" };

      if (user.ageConfirmedAt) {
        redirect(`/${locale}/account`);
      }

      const { birthMonth: month, birthYear: year } = parsed;

      if (!isAtLeastAge(month, year, MIN_ACCOUNT_AGE)) {
        const identities = await getUserLinkedAccounts(user.id);
        await addToBlocklist({
          type: "under13",
          email: user.email,
          identities,
          reason: "under_13",
          createdBy: "system",
          metadata: { birthMonth: month, birthYear: year },
        });
        await purgeUserAccount(user);
        redirect(`/${locale}/login?error=age_under13`);
      }

      await updateAuthUserById(user.id, {
        birthMonth: month,
        birthYear: year,
        ageConfirmedAt: new Date(),
      });

      redirect(`/${locale}/account`);
    },
    { requireAge: false, rethrow: false, error: "confirm_failed" },
  );
}
