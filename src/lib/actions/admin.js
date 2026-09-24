/** @file Admin server actions — listings, users, pets, moderation, settings. */
"use server";

import { connectDB, getMongoDb } from "@/config/db";
import { withAdminAction, withStaffAction } from "@/lib/auth/session";
import { getBanGuardError } from "@/lib/auth/ban";
import { getAuthUserById, normalizeAuthUser, updateAuthUserById } from "@/lib/auth/users";
import { notifyManualStatusChange } from "@/lib/email/account-status";
import { purgeUserAccount } from "@/lib/services/users";
import { deleteListingCompletely } from "@/lib/listings/purge-listing";
import { setListingStatus } from "@/lib/listings/status";
import { applyListingAdminUpdate, extendListingRecord } from "@/lib/services/listings";
import { resolveReportCase as resolveReportCaseService } from "@/lib/services/moderation";
import { getAppSettings, updateAppSettings as saveAppSettings } from "@/lib/services/settings";
import { checkMicrochipUnique } from "@/lib/services/owned-pets";
import { OwnedPet } from "@/models/owned-pet";
import { validate, adminListingSchema, adminUserSchema, adminOwnedPetSchema, adminGrantPremiumSchema, adminListingStatusSchema, adminOwnedPetStatusSchema, adminUserRoleSchema, adminBanUserSchema, adminOwnedPetNoteSchema, resolveReportCaseSchema } from "@/lib/validation";
import { isPremium, premiumPeriodEndFromYears } from "@/lib/premium/entitlements";
import { revalidatePath, revalidateTag } from "next/cache";
import { findListingByPublicId } from "@/lib/public-id";
import { listingPublicId as toListingPublicId } from "@/models/listing";
import { MODERATION_CASES_TAG } from "@/lib/moderation/report-cases";
import { syncOwnedPetStatus } from "@/lib/intelligence";

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/users");
  revalidatePath("/admin/pets");
  revalidateTag(MODERATION_CASES_TAG, "max");
}

/** Change listing status (activate, remove, etc.). */
export async function updateListingStatus(listingPublicId, status) {
  return withStaffAction("updateListingStatus", async () => {
    const parsed = validate(adminListingStatusSchema, { status });
    if (!parsed.ok) return { error: "Validation failed" };

    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    await setListingStatus(listing, parsed.data.status);
    revalidateAdmin();
    return { success: true };
  });
}

/** Permanently purge a listing and all derived data. Admin-only. */
export async function adminPurgeListing(listingPublicId) {
  return withAdminAction("adminPurgeListing", async () => {
    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    await deleteListingCompletely(listing);
    revalidateAdmin();
    return { success: true };
  });
}

/** Full admin edit of a listing's editable fields. */
export async function adminUpdateListing(listingPublicId, data) {
  return withStaffAction("adminUpdateListing", async () => {
    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    const parsed = validate(adminListingSchema, data);
    if (!parsed.ok) {
      return { error: parsed.error === "invalid_coordinates" ? "Invalid coordinates" : "Validation failed" };
    }

    const { type, status, petType, breed, color, description, address, city, country, lng, lat } = parsed.data;

    await applyListingAdminUpdate(listing, {
      type,
      status,
      petType,
      breed,
      color,
      description,
      location: {
        address: address || "",
        city: city || "",
        country: country || "",
        coordinates: [lng, lat],
      },
    });

    revalidateAdmin();
    revalidatePath(`/admin/listings/${toListingPublicId(listing)}`);
    return { success: true };
  });
}

/** Extend a listing's expiry (admin — bypasses user extension window). */
export async function adminExtendListing(listingPublicId) {
  return withStaffAction("adminExtendListing", async () => {
    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    const settings = await getAppSettings();
    await extendListingRecord(listing, settings);

    revalidateAdmin();
    revalidatePath(`/admin/listings/${toListingPublicId(listing)}`);
    return { success: true, expiresAt: listing.expiresAt.toISOString() };
  });
}

/** Resolve a moderation case (all open reports for listing + reason). */
export async function resolveReportCase({ listingId, reason, action, note }) {
  return withStaffAction("resolveReportCase", async (session) => {
    const parsed = validate(resolveReportCaseSchema, { listingId, reason, action, note });
    if (!parsed.ok) return { error: "Validation failed" };

    if (parsed.data.action === "purge_listing" && session.user.role !== "admin") {
      return { error: "forbidden" };
    }

    const result = await resolveReportCaseService({
      listingId: parsed.data.listingId,
      reason: parsed.data.reason,
      action: parsed.data.action,
      note: parsed.data.note,
      adminUserId: session.user.id,
    });

    if (result.error) return { error: result.error };

    if (
      result.ownerUserId &&
      (parsed.data.action === "confirm_violation" ||
        parsed.data.action === "remove_listing" ||
        parsed.data.action === "purge_listing")
    ) {
      const owner = await getAuthUserById(result.ownerUserId);
      if (owner?.publicId) revalidatePath(`/admin/users/${owner.publicId}`);
    }

    revalidateAdmin();
    revalidatePath("/admin/reports");
    return { success: true };
  });
}

/** Promote or demote a user's role. Admin-only. */
export async function updateUserRole(userId, role) {
  return withAdminAction("updateUserRole", async () => {
    const parsed = validate(adminUserRoleSchema, { role });
    if (!parsed.ok) return { error: "Validation failed" };

    await updateAuthUserById(userId, { role: parsed.data.role });
    const user = await getAuthUserById(userId);
    revalidatePath("/admin/users");
    if (user?.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    return { success: true };
  });
}

/**
 * Toggle ban status. Admin-only.
 *
 * @param {string} userId
 * @param {boolean} banned
 * @param {object} [options]
 * @param {string} [options.reason] - Optional note for the suspension email
 */
export async function banUser(userId, banned, { reason } = {}) {
  return withAdminAction("banUser", async () => {
    const parsed = validate(adminBanUserSchema, { reason });
    if (!parsed.ok) return { error: "Validation failed" };

    const user = await getAuthUserById(userId);
    if (!user) return { error: "User not found" };

    const nextStatus = banned ? "banned" : "active";
    const guardError = getBanGuardError({
      existingRole: user.role,
      nextRole: user.role,
      status: nextStatus,
    });
    if (guardError) return { error: guardError };

    const prevStatus = user.status || (user.banned ? "banned" : "active");
    await updateAuthUserById(userId, { status: nextStatus });

    await notifyManualStatusChange({
      prevStatus,
      nextStatus,
      email: user.email,
      ownerName: user.name,
      locale: user.locale || "en",
      reason: parsed.data.reason,
    });

    revalidatePath("/admin/users");
    if (user.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    return { success: true };
  });
}

/** Update user profile fields and role from the admin edit form. */
export async function adminUpdateUser(userId, data) {
  return withAdminAction("adminUpdateUser", async () => {
    const parsed = validate(adminUserSchema, data);
    if (!parsed.ok) {
      return {
        error: parsed.error
          ? `Validation failed: ${parsed.error}${parsed.field ? ` (${parsed.field})` : ""}`
          : "Validation failed",
      };
    }

    const { name, phone, phoneVerified, country, city, locale, role, username, status, banReason } =
      parsed.data;

    const existingUser = await getAuthUserById(userId);
    if (!existingUser) return { error: "User not found" };

    const guardError = getBanGuardError({
      existingRole: existingUser.role,
      nextRole: role,
      status,
    });
    if (guardError) return { error: guardError };

    const cleanUsername = (username || "").trim().toLowerCase().replace(/^@/, "");
    if (cleanUsername) {
      if (!isPremium(existingUser)) {
        return { error: "Only Premium accounts can set a custom handle" };
      }
      const db = await getMongoDb();
      const existingWithUsername = await db.collection("user").findOne({
        "handle.username": cleanUsername,
        $nor: [
          ...(existingUser._id ? [{ _id: existingUser._id }] : []),
          ...(existingUser.id ? [{ id: existingUser.id }] : []),
          { _id: userId },
          { id: userId },
        ],
      });
      if (existingWithUsername) {
        return { error: "This username is already taken" };
      }
    }

    const prevStatus = existingUser.status || (existingUser.banned ? "banned" : "active");
    const nextStatus = status || "active";

    const userPublicId = existingUser.publicId || existingUser.handle?.publicId;
    const existingHandle = existingUser.handle || (userPublicId ? { username: "", publicId: userPublicId } : undefined);
    const updatedHandle = existingHandle
      ? { ...existingHandle, username: cleanUsername }
      : userPublicId
        ? { username: cleanUsername, publicId: userPublicId }
        : undefined;

    const nextPhone = phone ?? null;
    const wantVerified = Boolean(phoneVerified) && Boolean(nextPhone);

    await updateAuthUserById(userId, {
      name,
      phone: nextPhone,
      phoneVerified: wantVerified,
      phoneVerifiedAt: wantVerified
        ? existingUser.phoneVerified && existingUser.phone === nextPhone
          ? existingUser.phoneVerifiedAt || new Date()
          : new Date()
        : null,
      country: country || "",
      city: city || "",
      locale: locale || "en",
      role,
      status: nextStatus,
      ...(updatedHandle ? { handle: updatedHandle } : {}),
    });

    await notifyManualStatusChange({
      prevStatus,
      nextStatus,
      email: existingUser.email,
      ownerName: name || existingUser.name,
      locale: locale || existingUser.locale || "en",
      reason: banReason,
    });

    const user = await getAuthUserById(userId);
    revalidatePath("/admin/users");
    if (user?.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    return { success: true };
  });
}

/**
 * Complimentary Premium grant. years=0 → forever. Rejects if already Premium.
 * @param {string} userId
 * @param {{ years: number }} data
 */
export async function adminGrantPremium(userId, data) {
  return withAdminAction("adminGrantPremium", async () => {
    const parsed = validate(adminGrantPremiumSchema, data);
    if (!parsed.ok) {
      return {
        error: parsed.error
          ? `Validation failed: ${parsed.error}${parsed.field ? ` (${parsed.field})` : ""}`
          : "Validation failed",
      };
    }

    const user = await getAuthUserById(userId);
    if (!user) return { error: "User not found" };
    if (isPremium(user)) return { error: "already_premium" };

    const periodEnd = premiumPeriodEndFromYears(parsed.data.years);
    await updateAuthUserById(userId, {
      premiumStatus: "active",
      premiumSource: "admin",
      premiumPeriodEnd: periodEnd,
      premiumStartedAt: new Date(),
    });

    revalidatePath("/admin/users");
    if (user.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    revalidatePath("/", "layout");
    return { success: true };
  });
}

/**
 * Revoke admin-granted Premium only (paid Stripe members use the billing portal).
 * @param {string} userId
 */
export async function adminRevokePremium(userId) {
  return withAdminAction("adminRevokePremium", async () => {
    const user = await getAuthUserById(userId);
    if (!user) return { error: "User not found" };
    if (!isPremium(user)) return { error: "not_premium" };
    if (user.premiumSource === "stripe") {
      return { error: "stripe_premium_use_portal" };
    }

    await updateAuthUserById(userId, {
      premiumStatus: "canceled",
      premiumSource: null,
      premiumPeriodEnd: new Date(),
    });

    revalidatePath("/admin/users");
    if (user.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    revalidatePath("/", "layout");
    return { success: true };
  });
}

/** Permanently delete a user and all owned data. Admin-only. */
export async function adminDeleteUser(userId) {
  return withAdminAction("adminDeleteUser", async (session) => {
    if (session.user.id === userId) return { error: "You cannot delete your own account" };

    const user = normalizeAuthUser(await getAuthUserById(userId));
    if (!user) return { error: "User not found" };

    await purgeUserAccount(user);
    revalidateAdmin();
    return { success: true };
  });
}

/** Upsert singleton app settings. Admin-only. */
export async function updateAppSettings(data) {
  return withAdminAction("updateAppSettings", async () => {
    const result = await saveAppSettings(data);
    if (result.error) return { error: result.error };

    try {
      const { syncPremiumStripePrice } = await import("@/lib/stripe/premium");
      await syncPremiumStripePrice();
    } catch (err) {
      console.error("[admin] premium Stripe price sync failed", err?.message || err);
    }

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { success: true };
  });
}

/** Quick status change for registered pets. */
export async function updateOwnedPetStatus(petPublicId, status) {
  return withStaffAction("updateOwnedPetStatus", async () => {
    const parsed = validate(adminOwnedPetStatusSchema, { status });
    if (!parsed.ok) return { error: "Validation failed" };

    const pet = await OwnedPet.findOne({ publicId: petPublicId });
    if (!pet) return { error: "Pet not found" };

    const prevStatus = pet.status;
    pet.status = parsed.data.status;
    await pet.save();

    if (prevStatus !== parsed.data.status) {
      await syncOwnedPetStatus(pet._id, parsed.data.status);
    }

    revalidatePath("/admin/pets");
    revalidatePath(`/admin/pets/${petPublicId}`);
    return { success: true };
  });
}

/** Save an admin note on a registered pet. */
export async function updateOwnedPetAdminNote(petPublicId, adminNote) {
  return withStaffAction("updateOwnedPetAdminNote", async () => {
    const parsed = validate(adminOwnedPetNoteSchema, { adminNote });
    if (!parsed.ok) return { error: "Validation failed" };

    await OwnedPet.findOneAndUpdate({ publicId: petPublicId }, { adminNote: parsed.data.adminNote });
    revalidatePath("/admin/pets");
    revalidatePath(`/admin/pets/${petPublicId}`);
    return { success: true };
  });
}

/** Full admin edit of a registered pet. */
export async function adminUpdateOwnedPet(petPublicId, data) {
  return withStaffAction("adminUpdateOwnedPet", async () => {
    const pet = await OwnedPet.findOne({ publicId: petPublicId });
    if (!pet) return { error: "Pet not found" };

    const parsed = validate(adminOwnedPetSchema, data);
    if (!parsed.ok) return { error: parsed.error === "invalid_format" ? "Invalid microchip ID" : "Validation failed" };

    const { name, microchipId, petType, breed, color, description, status, adminNote } = parsed.data;

    if (microchipId !== pet.microchipId) {
      const isUnique = await checkMicrochipUnique(microchipId, pet._id);
      if (!isUnique) return { error: "Microchip ID already registered" };
    }

    const prevStatus = pet.status;

    pet.name = name;
    pet.microchipId = microchipId;
    pet.petType = petType;
    pet.breed = breed || "";
    pet.color = color;
    pet.description = description || "";
    pet.status = status;
    pet.adminNote = adminNote || "";

    await pet.save();

    if (prevStatus !== status) {
      await syncOwnedPetStatus(pet._id, status);
    }

    revalidatePath("/admin/pets");
    revalidatePath(`/admin/pets/${petPublicId}`);
    return { success: true };
  });
}

/** Staff requeue for a listing stuck in pending/failed ML processing. */
export async function adminRequeueListingProcessing(listingPublicId) {
  return withStaffAction("adminRequeueListingProcessing", async () => {
    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    const { requeueListingProcessing } = await import("@/lib/intelligence");
    const result = await requeueListingProcessing(listing);
    if (result.error) {
      return { error: result.errorKey || result.error };
    }

    revalidateAdmin();
    revalidatePath(`/admin/listings/${listingPublicId}`);
    return { success: true };
  });
}

/** Staff requeue for an owned pet stuck in pending/failed ML processing. */
export async function adminRequeueOwnedPetProcessing(petPublicId) {
  return withStaffAction("adminRequeueOwnedPetProcessing", async () => {
    const pet = await OwnedPet.findOne({ publicId: petPublicId });
    if (!pet) return { error: "Pet not found" };

    const { requeueOwnedPetProcessing } = await import("@/lib/intelligence");
    const result = await requeueOwnedPetProcessing(pet);
    if (result.error) {
      return { error: result.errorKey || result.error };
    }

    revalidatePath("/admin/pets");
    revalidatePath(`/admin/pets/${petPublicId}`);
    return { success: true };
  });
}
