/** @file Admin server actions — listings, users, pets, moderation, settings. */
"use server";

import { connectDB } from "@/config/db";
import { authActionError, requireAdmin, requireStaff } from "@/lib/auth/session";
import { getAuthUserById, normalizeAuthUser, updateAuthUserById } from "@/lib/auth/users";
import { purgeUserAccount } from "@/lib/services/users";
import { deleteListingCompletely } from "@/lib/listings/purge-listing";
import { setListingStatus } from "@/lib/listings/status";
import { applyListingAdminUpdate, extendListingRecord } from "@/lib/services/listings";
import { resolveReportCase as resolveReportCaseService } from "@/lib/services/moderation";
import { getAppSettings, updateAppSettings as saveAppSettings } from "@/lib/services/settings";
import { OwnedPet } from "@/models/owned-pet";
import { validate, adminListingSchema, adminUserSchema, adminOwnedPetSchema } from "@/lib/validation";
import { revalidatePath, revalidateTag } from "next/cache";
import { findListingByPublicId } from "@/lib/public-id";
import { listingPublicId } from "@/models/listing";
import { MODERATION_CASES_TAG } from "@/lib/moderation/report-cases";
import { syncOwnedPetStatus } from "@/lib/intelligence/sync-owned-pet-status";

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
  try {
    await requireStaff();
    await connectDB();
    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    await setListingStatus(listing, status);
    revalidateAdmin();
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Permanently purge a listing and all derived data. Admin-only. */
export async function adminPurgeListing(listingPublicId) {
  try {
    await requireAdmin();
    await connectDB();

    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    await deleteListingCompletely(listing);
    revalidateAdmin();
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Full admin edit of a listing's editable fields. */
export async function adminUpdateListing(listingPublicId, data) {
  try {
    await requireStaff();
    await connectDB();

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
    revalidatePath(`/admin/listings/${listingPublicId(listing)}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Extend a listing's expiry (admin — bypasses user extension window). */
export async function adminExtendListing(listingPublicId) {
  try {
    await requireStaff();
    await connectDB();

    const listing = await findListingByPublicId(listingPublicId);
    if (!listing) return { error: "Listing not found" };

    const settings = await getAppSettings();
    await extendListingRecord(listing, settings);

    revalidateAdmin();
    revalidatePath(`/admin/listings/${listingPublicId(listing)}`);
    return { success: true, expiresAt: listing.expiresAt.toISOString() };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Resolve a moderation case (all open reports for listing + reason). */
export async function resolveReportCase({ listingId, reason, action, note }) {
  try {
    const session = await requireStaff();
    if (action === "purge_listing") {
      await requireAdmin();
    }

    await connectDB();

    const result = await resolveReportCaseService({
      listingId,
      reason,
      action,
      note,
      adminUserId: session.user.id,
    });

    if (result.error) return { error: result.error };

    if (
      result.ownerUserId &&
      (action === "confirm_violation" || action === "remove_listing" || action === "purge_listing")
    ) {
      const owner = await getAuthUserById(result.ownerUserId);
      if (owner?.publicId) revalidatePath(`/admin/users/${owner.publicId}`);
    }

    revalidateAdmin();
    revalidatePath("/admin/reports");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Promote or demote a user's role. Admin-only. */
export async function updateUserRole(userId, role) {
  try {
    await requireAdmin();
    await updateAuthUserById(userId, { role });
    const user = await getAuthUserById(userId);
    revalidatePath("/admin/users");
    if (user?.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Toggle ban status. Admin-only. */
export async function banUser(userId, banned) {
  try {
    await requireAdmin();
    await updateAuthUserById(userId, { banned });
    const user = await getAuthUserById(userId);
    revalidatePath("/admin/users");
    if (user?.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Update user profile fields and role from the admin edit form. */
export async function adminUpdateUser(userId, data) {
  try {
    await requireAdmin();

    const parsed = validate(adminUserSchema, data);
    if (!parsed.ok) return { error: "Validation failed" };

    const { name, phone, country, city, locale, role, banned } = parsed.data;

    await updateAuthUserById(userId, {
      name,
      phone: phone ?? null,
      country: country || "",
      city: city || "",
      locale: locale || "en",
      role,
      banned: Boolean(banned),
    });

    const user = await getAuthUserById(userId);
    revalidatePath("/admin/users");
    if (user?.publicId) revalidatePath(`/admin/users/${user.publicId}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Permanently delete a user and all owned data. Admin-only. */
export async function adminDeleteUser(userId) {
  try {
    const session = await requireAdmin();
    if (session.user.id === userId) return { error: "You cannot delete your own account" };

    const user = normalizeAuthUser(await getAuthUserById(userId));
    if (!user) return { error: "User not found" };

    await purgeUserAccount(user);
    revalidateAdmin();
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Upsert singleton app settings. Admin-only. */
export async function updateAppSettings(data) {
  try {
    await requireAdmin();

    const result = await saveAppSettings(data);
    if (result.error) return { error: result.error };

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Quick status change for registered pets. */
export async function updateOwnedPetStatus(petPublicId, status) {
  try {
    await requireStaff();
    await connectDB();

    const pet = await OwnedPet.findOne({ publicId: petPublicId });
    if (!pet) return { error: "Pet not found" };

    const prevStatus = pet.status;
    pet.status = status;
    await pet.save();

    if (prevStatus !== status) {
      await syncOwnedPetStatus(pet._id, status);
    }

    revalidatePath("/admin/pets");
    revalidatePath(`/admin/pets/${petPublicId}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Save an admin note on a registered pet. */
export async function updateOwnedPetAdminNote(petPublicId, adminNote) {
  try {
    await requireStaff();
    await connectDB();
    await OwnedPet.findOneAndUpdate({ publicId: petPublicId }, { adminNote });
    revalidatePath("/admin/pets");
    revalidatePath(`/admin/pets/${petPublicId}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Full admin edit of a registered pet. */
export async function adminUpdateOwnedPet(petPublicId, data) {
  try {
    await requireStaff();
    await connectDB();

    const pet = await OwnedPet.findOne({ publicId: petPublicId });
    if (!pet) return { error: "Pet not found" };

    const parsed = validate(adminOwnedPetSchema, data);
    if (!parsed.ok) return { error: parsed.error === "invalid_format" ? "Invalid microchip ID" : "Validation failed" };

    const { name, microchipId, petType, breed, color, description, status, adminNote } = parsed.data;

    if (microchipId !== pet.microchipId) {
      const duplicate = await OwnedPet.findOne({ microchipId, _id: { $ne: pet._id } });
      if (duplicate) return { error: "Microchip ID already registered" };
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
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}
