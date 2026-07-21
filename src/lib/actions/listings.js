/** @file Listing server actions — create, update, resolve, extend, contact, reports. */
"use server";

import { connectDB } from "@/config/db";
import { withAuthAction } from "@/lib/auth/session";
import { requireOwnedListing } from "@/lib/actions/require-owned";
import { Listing, listingPublicId } from "@/models/listing";
import { getAppSettings } from "@/lib/services/settings";
import { checkListingRateLimit, incrementListingCount } from "@/lib/rate-limit";
import { enqueueListingProcessing } from "@/lib/intelligence";
import { markProcessingFailed } from "@/lib/intelligence/processing-failure";
import { extendListingRecord, resolveListingRecord, deleteListingRecord } from "@/lib/services/listings";
import {
  validate,
  createListingSchema,
  updateListingSchema,
  listingContactSchema,
  listingReportSchema,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { getAuthUserById } from "@/lib/auth/users";
import { canUserExtendListing, computeInitialExpiresAt } from "@/lib/listings/expiry";
import { hasReunionExtensionLock } from "@/lib/intelligence/matching/reunion";
import { revealListingContact } from "@/lib/listings/reveal-contact";
import { submitListingReport } from "@/lib/listings/submit-report";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { runTurnstileAction } from "@/lib/turnstile";
import { markUploadsAttached } from "@/lib/storage/cleanup";

/**
 * Checks if a user is allowed to create a new listing based on rate limits.
 * @param {string} userId
 */
async function checkListingLimitsAndStatus(userId) {
  const rateCheck = await checkListingRateLimit(userId);
  if (!rateCheck.allowed) {
    if (rateCheck.reason === "banned") return { allowed: false, error: "user_banned" };
    if (rateCheck.reason === "inactive") {
      const u = await getAuthUserById(userId);
      const status = u?.status || "inactive";
      return { allowed: false, error: `user_${status}` };
    }
    if (rateCheck.reason === "monthly") return { allowed: false, error: "listing_limit_monthly" };
    if (rateCheck.reason === "daily") return { allowed: false, error: "listing_limit_daily" };
    return { allowed: false, error: "create_failed" };
  }
  return { allowed: true, rateCheck };
}

/** Persists the listing and marks associated uploads as attached. */
async function persistListing(listingData, userId, expiresAt) {
  const listing = await Listing.create({
    type: listingData.type,
    petType: listingData.petType,
    breed: listingData.breed || "",
    color: listingData.color,
    description: listingData.description || "",
    images: listingData.images.map((img, i) => ({ ...img, order: i })),
    location: {
      address: listingData.address || "",
      city: listingData.city || "",
      country: listingData.country || "",
      coordinates: [listingData.lng, listingData.lat],
    },
    locationSource: listingData.locationSource || "manual",
    contact: {
      allowEmail: listingData.allowEmail ?? false,
      allowPhone: listingData.allowPhone ?? false,
    },
    userId,
    expiresAt,
    status: "active",
    processingStatus: "pending",
    locale: listingData.locale || "en",
  });

  const s3Keys = listingData.images.map((img) => img.s3Key).filter(Boolean);
  await markUploadsAttached(s3Keys);

  return listing;
}

/** Create a listing, enqueue ML processing, and apply rate limits. */
export async function createListing(data) {
  return withAuthAction(
    "createListing",
    async (session) => {
      const limitCheck = await checkListingLimitsAndStatus(session.user.id);
      if (!limitCheck.allowed) return { error: limitCheck.error };
      const { rateCheck } = limitCheck;

      const parsed = validate(createListingSchema, data);
      if (!parsed.ok) {
        if (parsed.error === "invalid_coordinates") return { error: "invalid_coordinates" };
        if (parsed.error === "contact_required") return { error: "contact_required" };
        return { error: "images_required" };
      }

      const settings = await getAppSettings();
      const expiresAt = computeInitialExpiresAt(new Date(), settings);
      const listing = await persistListing(parsed.data, session.user.id, expiresAt);

      await incrementListingCount(
        session.user.id,
        rateCheck.listingsToday || 0,
        rateCheck.listingsThisMonth || 0
      );

      const imageUrls = parsed.data.images.map((img) => img.url);
      const enqueueResult = await enqueueListingProcessing({
        listingId: listing._id,
        imageUrls,
        listingType: parsed.data.type,
        petType: parsed.data.petType,
      });

      const id = listingPublicId(listing);

      if (!enqueueResult.ok) {
        await markProcessingFailed(listing, enqueueResult.error || "ENQUEUE_FAILED");
        revalidatePath("/");
        return { success: true, id, processingWarning: true };
      }

      revalidatePath("/");
      return { success: true, id };
    },
    { rethrow: false, error: "create_failed" }
  );
}

/** Mark the owner's listing as resolved. */
export async function resolveListing(publicId) {
  return withAuthAction("resolveListing", async (session) => {
    const owned = await requireOwnedListing(session, publicId);
    if (owned.error) return owned;

    await resolveListingRecord(owned.listing);
    revalidatePath("/");
    return { success: true };
  });
}

/** Soft-delete a listing (owner only). */
export async function deleteListing(publicId) {
  return withAuthAction("deleteListing", async (session) => {
    const owned = await requireOwnedListing(session, publicId);
    if (owned.error) return owned;

    if (owned.listing.status === "removed") {
      return { success: true };
    }

    await deleteListingRecord(owned.listing);
    revalidatePath("/");
    revalidatePath(`/listings/${publicId}`);
    return { success: true };
  });
}

/** Update editable fields on an active listing (owner only). */
export async function updateListing(publicId, data) {
  return withAuthAction("updateListing", async (session) => {
    const owned = await requireOwnedListing(session, publicId, { status: "active" });
    if (owned.error) return owned;

    const parsed = validate(updateListingSchema, data);
    if (!parsed.ok) {
      if (parsed.error === "invalid_coordinates") {
        return { error: "Invalid coordinates" };
      }
      return { error: "Validation failed" };
    }

    const { color, breed, description, address, city, country, lng, lat } = parsed.data;
    const listing = owned.listing;

    listing.color = color;
    listing.breed = breed || "";
    listing.description = description || "";
    listing.location = {
      address: address || "",
      city: city || "",
      country: country || "",
      coordinates: [lng, lat],
    };

    await listing.save();
    revalidatePath("/");
    return { success: true };
  });
}

/** Extend an active listing's expiry (owner only). */
export async function extendListing(publicId) {
  return withAuthAction("extendListing", async (session) => {
    const owned = await requireOwnedListing(session, publicId);
    if (owned.error) return owned;

    const listing = owned.listing;
    const settings = await getAppSettings();
    const extensionLocked = await hasReunionExtensionLock(listing._id);
    const check = canUserExtendListing(
      { status: listing.status, expiresAt: listing.expiresAt, extensionLocked },
      settings
    );
    if (!check.allowed) {
      return { error: check.reason };
    }

    await extendListingRecord(listing, settings);
    revalidatePath("/");
    return { success: true, expiresAt: listing.expiresAt.toISOString() };
  });
}

/** Turnstile-gated contact reveal for an active listing. */
export async function revealListingContactAction(listingPublicId, token) {
  return runTurnstileAction(listingContactSchema, { token }, TURNSTILE_ACTIONS.LISTING_CONTACT, async () => {
    await connectDB();
    const result = await revealListingContact(listingPublicId);

    if (!result.ok) {
      return { error: result.error };
    }

    return { success: true, contact: result.contact };
  });
}

/** Authenticated listing report with Turnstile verification. */
export async function submitListingReportAction({ listingPublicId, token, reason, details }) {
  return runTurnstileAction(
    listingReportSchema,
    { token, reason, details },
    TURNSTILE_ACTIONS.LISTING_REPORT,
    async (parsed) => {
      await connectDB();
      const result = await submitListingReport({
        listingId: listingPublicId,
        reason: parsed.reason,
        details: parsed.details,
      });

      if (!result.ok) {
        return { error: result.error };
      }

      revalidatePath("/");
      revalidatePath(`/listings/${listingPublicId}`);
      return { success: true };
    }
  );
}
