/** @file Account profile server actions — update profile, delete account. */
"use server";

import { getAuthUserById, normalizeAuthUser, updateAuthUserById } from "@/lib/auth/users";
import { withAuthAction } from "@/lib/auth/session";
import { purgeUserAccount } from "@/lib/services/users";
import { validate, updateProfileSchema } from "@/lib/validation";
import { markUploadsAttached } from "@/lib/storage/cleanup";
import { resolveStorageKey } from "@/lib/storage/urls";
import { revalidatePath } from "next/cache";

const ERROR_MESSAGES = {
  invalid_phone: "Invalid phone number",
  invalid_country: "Invalid country code",
  invalid_input: "Invalid input",
};

/** Update the signed-in user's profile (name, contact, locale, location, avatar). */
export async function updateProfile({ name, phone, locale, country, city, image }) {
  return withAuthAction("updateProfile", async (session) => {
    const parsed = validate(updateProfileSchema, { name, phone, locale, country, city, image });
    if (!parsed.ok) {
      return { error: ERROR_MESSAGES[parsed.error] ?? ERROR_MESSAGES.invalid_input };
    }

    const updates = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || "";
    if (parsed.data.locale) updates.locale = parsed.data.locale;
    if (parsed.data.country !== undefined) updates.country = parsed.data.country || "";
    if (parsed.data.city !== undefined) updates.city = parsed.data.city || "";
    if (parsed.data.image !== undefined) updates.image = parsed.data.image || "";

    await updateAuthUserById(session.user.id, updates);

    if (parsed.data.image) {
      const key = resolveStorageKey(parsed.data.image);
      if (key) await markUploadsAttached(key);
    }

    revalidatePath("/");
    return { success: true, locale: parsed.data.locale };
  });
}

/** Permanently delete the signed-in user's account and all associated data. */
export async function deleteMyAccount() {
  return withAuthAction("deleteMyAccount", async (session) => {
    const user = normalizeAuthUser(await getAuthUserById(session.user.id));
    if (!user) return { error: "Account not found" };

    await purgeUserAccount(user);

    revalidatePath("/");
    revalidatePath("/account", "layout");
    return { success: true };
  });
}
