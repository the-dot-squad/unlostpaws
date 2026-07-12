/** @file Account profile server actions — update profile, delete account. */
"use server";

import { getAuthUserById, normalizeAuthUser, updateAuthUserById } from "@/lib/auth/users";
import { authActionError, requireActiveSession } from "@/lib/auth/session";
import { purgeUserAccount } from "@/lib/services/users";
import { validate, updateProfileSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

const ERROR_MESSAGES = {
  invalid_phone: "Invalid phone number",
  invalid_country: "Invalid country code",
  invalid_input: "Invalid input",
};

/** Update the signed-in user's profile (name, contact, locale, location, avatar). */
export async function updateProfile({ name, phone, locale, country, city, image }) {
  try {
    const session = await requireActiveSession();

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
      const { extractKeyFromImageOrUrl } = await import("@/lib/storage/cleanup-helpers");
      const key = extractKeyFromImageOrUrl(parsed.data.image);
      if (key) {
        const { Upload } = await import("@/models/upload");
        await Upload.updateMany({ key }, { $set: { status: "attached" } });
      }
    }

    revalidatePath("/");
    return { success: true, locale: parsed.data.locale };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Permanently delete the signed-in user's account and all associated data. */
export async function deleteMyAccount() {
  try {
    const session = await requireActiveSession();

    const user = normalizeAuthUser(await getAuthUserById(session.user.id));
    if (!user) return { error: "Account not found" };

    await purgeUserAccount(user);

    revalidatePath("/");
    revalidatePath("/account", "layout");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}
