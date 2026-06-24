/** @file Listing server actions — create, update, resolve, extend, contact, reports. */
"use server";

import { connectDB } from "@/config/db";
import { authActionError, requireActiveSession } from "@/lib/auth/session";
import { Listing } from "@/models/listing";
import { getAppSettings } from "@/lib/services/settings";
import { checkListingRateLimit, incrementListingCount } from "@/lib/rate-limit";
import { enqueueListingProcessing } from "@/lib/intelligence";
import { extendListingRecord, resolveListingRecord, deleteListingRecord } from "@/lib/services/listings";
import {
  validate,
  createListingSchema,
  updateListingSchema,
  listingContactSchema,
  listingReportSchema,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { findListingByPublicId } from "@/lib/public-id";
import { listingPublicId } from "@/models/listing";
import { canUserExtendListing, computeInitialExpiresAt } from "@/lib/listings/expiry";
import { hasReunionExtensionLock } from "@/lib/intelligence/matching/reunion";
import { revealListingContact } from "@/lib/listings/reveal-contact";
import { submitListingReport } from "@/lib/listings/submit-report";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { verifyListingTurnstile } from "@/lib/turnstile";

/** Create a listing, enqueue ML processing, and apply rate limits. @returns {Promise<{ success: true, id: string } | { error: string }>} */
export async function createListing(data) {
  try {
    const session = await requireActiveSession();

    const rateCheck = await checkListingRateLimit(session.user.id);
    if (!rateCheck.allowed) {
      return { error: `Rate limit exceeded (${rateCheck.reason})` };
    }

    const parsed = validate(createListingSchema, data);
    if (!parsed.ok) {
      if (parsed.error === "invalid_coordinates") {
        return { error: "invalid_coordinates" };
      }
      if (parsed.error === "contact_required") {
        return { error: "contact_required" };
      }
      return { error: "images_required" };
    }

    const listingData = parsed.data;
    const settings = await getAppSettings();
    const expiresAt = computeInitialExpiresAt(new Date(), settings);

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
      userId: session.user.id,
      expiresAt,
      status: "active",
      processingStatus: "pending",
    });

    await incrementListingCount(
      session.user.id,
      rateCheck.listingsToday || 0,
      rateCheck.listingsThisMonth || 0
    );

    const imageUrls = listingData.images.map((img) => img.url);
    const enqueueResult = await enqueueListingProcessing({
      listingId: listing._id,
      imageUrls,
      listingType: listingData.type,
      petType: listingData.petType,
    });

    const id = listingPublicId(listing);

    if (!enqueueResult.ok) {
      listing.processingStatus = "failed";
      listing.processingError = enqueueResult.error || "ENQUEUE_FAILED";
      await listing.save();
      revalidatePath("/");
      return { success: true, id, processingWarning: true };
    }

    revalidatePath("/");
    return { success: true, id };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    console.error("createListing failed:", err);
    return { error: "create_failed" };
  }
}

/** Mark the owner's listing as resolved. */
export async function resolveListing(publicId) {
  try {
    const session = await requireActiveSession();

    const listing = await findListingByPublicId(publicId, { userId: session.user.id });
    if (!listing) return { error: "Not found" };

    await resolveListingRecord(listing);
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Soft-delete a listing (owner only). */
export async function deleteListing(publicId) {
  try {
    const session = await requireActiveSession();

    const listing = await findListingByPublicId(publicId, { userId: session.user.id });
    if (!listing) return { error: "Not found" };

    if (listing.status === "removed") {
      return { success: true };
    }

    await deleteListingRecord(listing);
    revalidatePath("/");
    revalidatePath(`/listings/${publicId}`);
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Update editable fields on an active listing (owner only). */
export async function updateListing(publicId, data) {
  try {
    const session = await requireActiveSession();

    const listing = await findListingByPublicId(publicId, {
      userId: session.user.id,
      status: "active",
    });

    if (!listing) {
      return { error: "Not found" };
    }

    const parsed = validate(updateListingSchema, data);
    if (!parsed.ok) {
      if (parsed.error === "invalid_coordinates") {
        return { error: "Invalid coordinates" };
      }
      return { error: "Validation failed" };
    }

    const { color, breed, description, address, city, country, lng, lat } = parsed.data;

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
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Extend an active listing's expiry (owner only). */
export async function extendListing(publicId) {
  try {
    const session = await requireActiveSession();

    const listing = await findListingByPublicId(publicId, { userId: session.user.id });
    if (!listing) {
      return { error: "Not found" };
    }

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
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Turnstile-gated contact reveal for an active listing. */
export async function revealListingContactAction(listingPublicId, token) {
  const parsed = validate(listingContactSchema, { token });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const captcha = await verifyListingTurnstile(token, TURNSTILE_ACTIONS.LISTING_CONTACT);
  if (!captcha.ok) {
    return { error: captcha.error };
  }

  await connectDB();
  const result = await revealListingContact(listingPublicId);

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true, contact: result.contact };
}

/** Authenticated listing report with Turnstile verification. */
export async function submitListingReportAction({ listingPublicId, token, reason, details }) {
  const parsed = validate(listingReportSchema, { token, reason, details });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const captcha = await verifyListingTurnstile(token, TURNSTILE_ACTIONS.LISTING_REPORT);
  if (!captcha.ok) {
    return { error: captcha.error };
  }

  await connectDB();
  const result = await submitListingReport({
    listingId: listingPublicId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/");
  revalidatePath(`/listings/${listingPublicId}`);
  return { success: true };
}
