/** @file Account profile server actions — update profile, delete account. */
"use server";

import { getAuthUserById, normalizeAuthUser, updateAuthUserById } from "@/lib/auth/users";
import { withAuthAction } from "@/lib/auth/session";
import { purgeUserAccount } from "@/lib/services/users";
import { validate, updateProfileSchema } from "@/lib/validation";
import { markUploadsAttached } from "@/lib/storage/cleanup";
import { resolveStorageKey } from "@/lib/storage/urls";
import { getMongoDb } from "@/config/db";
import { encodeUserPublicId } from "@/lib/public-id";
import { revalidateLocalizedPath } from "@/lib/i18n/revalidate";
import { isPremium, phoneChangeAvailableAt } from "@/lib/premium/entitlements";

/** Update the signed-in user's profile (name, contact, locale, location, avatar, username). */
export async function updateProfile({ name, phone, locale, country, city, image, username }) {
  return withAuthAction("updateProfile", async (session) => {
    const parsed = validate(updateProfileSchema, { name, phone, locale, country, city, image, username });
    if (!parsed.ok) {
      return { error: parsed.error || "invalid_input" };
    }

    const existingUser = await getAuthUserById(session.user.id);
    if (!existingUser) return { error: "not_found" };

    const updates = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.locale) updates.locale = parsed.data.locale;
    if (parsed.data.country !== undefined) updates.country = parsed.data.country || "";
    if (parsed.data.city !== undefined) updates.city = parsed.data.city || "";
    if (parsed.data.image !== undefined) updates.image = parsed.data.image || "";

    if (parsed.data.phone !== undefined) {
      const nextPhone = parsed.data.phone || "";
      const prevPhone = existingUser.phone || "";
      const premium = isPremium(existingUser);

      if (premium) {
        if (!nextPhone) {
          if (existingUser.phoneVerified && phoneChangeAvailableAt(existingUser)) {
            return { error: "phone_change_cooldown" };
          }
          updates.phone = "";
          updates.phoneVerified = false;
          updates.phoneVerifiedAt = null;
          updates.phoneOtp = null;
        } else if (nextPhone === prevPhone) {
          // no-op
        } else if (!prevPhone || !existingUser.phoneVerified) {
          updates.phone = nextPhone;
          updates.phoneVerified = false;
          updates.phoneVerifiedAt = null;
          updates.phoneOtp = null;
        } else {
          return { error: "use_phone_verify_flow" };
        }
      } else {
        updates.phone = nextPhone;
        if (nextPhone !== prevPhone) {
          updates.phoneVerified = false;
          updates.phoneVerifiedAt = null;
          updates.phoneOtp = null;
        }
      }
    }

    if (parsed.data.username !== undefined) {
      const cleanUsername = parsed.data.username.trim().toLowerCase();
      const premium = isPremium(existingUser);

      if (cleanUsername) {
        if (!premium) {
          return { error: "only_premium_can_set_username" };
        }

        const db = await getMongoDb();
        const existingTaken = await db.collection("user").findOne({
          "handle.username": cleanUsername,
          $nor: [
            ...(existingUser._id ? [{ _id: existingUser._id }] : []),
            ...(existingUser.id ? [{ id: existingUser.id }] : []),
          ],
        });

        if (existingTaken) {
          return { error: "username_already_taken" };
        }
      }

      const publicId = existingUser.publicId || existingUser.handle?.publicId || encodeUserPublicId(existingUser._id || session.user.id);
      updates.handle = {
        username: cleanUsername,
        publicId,
      };
    }

    await updateAuthUserById(session.user.id, updates);

    if (parsed.data.image) {
      const key = resolveStorageKey(parsed.data.image);
      if (key) await markUploadsAttached(key);
    }

    await revalidateLocalizedPath("/");
    await revalidateLocalizedPath("/account/settings");
    return { success: true, locale: parsed.data.locale };
  });
}

/** Permanently delete the signed-in user's account and all associated data. */
export async function deleteMyAccount() {
  return withAuthAction("deleteMyAccount", async (session) => {
    const user = normalizeAuthUser(await getAuthUserById(session.user.id));
    if (!user) return { error: "not_found" };

    await purgeUserAccount(user);

    await revalidateLocalizedPath("/");
    await revalidateLocalizedPath("/account", "layout");
    return { success: true };
  });
}
