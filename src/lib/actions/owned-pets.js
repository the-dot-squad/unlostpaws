/** @file Owned-pet server actions — register, update, archive. */
"use server";

import { withAuthAction } from "@/lib/auth/session";
import { requireOwnedPet } from "@/lib/actions/require-owned";
import { OwnedPet } from "@/models/owned-pet";
import { getAppSettings } from "@/lib/services/settings";
import { checkMicrochipUnique } from "@/lib/services/owned-pets";
import { validate, ownedPetSchema, tagContactSchema } from "@/lib/validation";
import {
  enqueueOwnedPetProcessing,
  markProcessingFailed,
  syncOwnedPetStatus,
} from "@/lib/intelligence";
import { revalidatePath } from "next/cache";
import { deleteOwnedPetVector } from "@/lib/qdrant";
import { encodeOwnedPetPublicId } from "@/lib/public-id";
import { markUploadsAttached } from "@/lib/storage/cleanup";
import { isPremium } from "@/lib/premium/entitlements";
import { normalizeDigitalCollar } from "@/lib/pets/digital-collar-shared";
import { revealTagContact } from "@/lib/pets/reveal-tag-contact";
import { runTurnstileAction } from "@/lib/turnstile";
import { TURNSTILE_ACTIONS } from "@/config/constants/turnstile";
import { connectDB } from "@/config/db";

function mapOwnedPetValidationError(parsed) {
  if (parsed.ok) return null;
  if (parsed.error === "invalid_format") return "INVALID_MICROCHIP";
  if (parsed.error === "contact_required") return "CONTACT_REQUIRED";
  if (parsed.error === "medical_alerts_too_long") return "MEDICAL_ALERTS_TOO_LONG";
  if (parsed.error === "required") return "REQUIRED";
  return "PHOTO_REQUIRED";
}

/**
 * Apply Digital Collar fields when Premium; reject enable without Premium.
 * @param {object} user
 * @param {object | undefined} collarInput
 * @returns {{ error?: string, collar?: ReturnType<typeof normalizeDigitalCollar> }}
 */
function resolveDigitalCollarWrite(user, collarInput) {
  if (collarInput === undefined) return {};

  const collar = normalizeDigitalCollar({ digitalCollar: collarInput });
  if (!isPremium(user)) {
    if (collar.enabled) {
      return { error: "premium_required" };
    }
    return {};
  }

  return { collar };
}

/** @param {string} publicId */
function revalidateTagPage(publicId) {
  if (!publicId) return;
  revalidatePath(`/tag/${publicId}`);
}

async function setOwnedPetStatus(session, publicId, status) {
  const owned = await requireOwnedPet(session, publicId);
  if (owned.error) return owned;

  owned.pet.status = status;
  await owned.pet.save();
  await syncOwnedPetStatus(owned.pet._id, status);

  revalidatePath("/");
  revalidateTagPage(owned.pet.publicId);
  return { success: true };
}

/** Register a pet, enforce per-user limits, and enqueue ML embedding. */
export async function createOwnedPet(data) {
  return withAuthAction("createOwnedPet", async (session) => {
    const parsed = validate(ownedPetSchema, data);
    const validationError = mapOwnedPetValidationError(parsed);
    if (validationError) {
      return { error: validationError };
    }

    const petData = parsed.data;
    const collarWrite = resolveDigitalCollarWrite(session.user, petData.digitalCollar);
    if (collarWrite.error) return { error: collarWrite.error };

    const settings = await getAppSettings();
    const count = await OwnedPet.countDocuments({
      userId: session.user.id,
      status: { $ne: "removed" },
    });

    if (count >= settings.maxOwnedPetsPerUser) {
      return { error: "MAX_PETS_REACHED" };
    }

    const isUnique = await checkMicrochipUnique(petData.microchipId);
    if (!isUnique) {
      return { error: "MICROCHIP_DUPLICATE" };
    }

    const pet = await OwnedPet.create({
      userId: session.user.id,
      name: petData.name,
      microchipId: petData.microchipId,
      petType: petData.petType,
      breed: petData.breed || "",
      color: petData.color,
      description: petData.description || "",
      photo: petData.photo,
      photo2: petData.photo2,
      passportPhoto: petData.passportPhoto,
      ...(collarWrite.collar ? { digitalCollar: collarWrite.collar } : {}),
      status: "active",
      processingStatus: "pending",
    });

    pet.publicId = encodeOwnedPetPublicId(pet._id);
    await pet.save();

    const s3Keys = [petData.photo?.s3Key, petData.photo2?.s3Key, petData.passportPhoto?.s3Key].filter(Boolean);
    await markUploadsAttached(s3Keys);

    const enqueueResult = await enqueueOwnedPetProcessing({
      ownedPetId: pet._id.toString(),
      imageUrl: petData.photo.url,
      petType: petData.petType,
    });

    if (!enqueueResult.ok) {
      await markProcessingFailed(pet, enqueueResult.error || "ENQUEUE_FAILED");
    }

    revalidatePath("/");
    return { success: true, id: pet.publicId };
  });
}

/** Update a registered pet; re-embeds when the primary photo changes. */
export async function updateOwnedPet(publicId, data) {
  return withAuthAction("updateOwnedPet", async (session) => {
    const owned = await requireOwnedPet(session, publicId);
    if (owned.error) return owned;
    const pet = owned.pet;

    if (pet.status === "archived") {
      return { error: "CANNOT_EDIT_ARCHIVED" };
    }

    const parsed = validate(ownedPetSchema, data);
    const validationError = mapOwnedPetValidationError(parsed);
    if (validationError) {
      return { error: validationError };
    }

    const petData = parsed.data;
    const collarWrite = resolveDigitalCollarWrite(session.user, petData.digitalCollar);
    if (collarWrite.error) return { error: collarWrite.error };

    const isUnique = await checkMicrochipUnique(petData.microchipId, pet._id);
    if (!isUnique) {
      return { error: "MICROCHIP_DUPLICATE" };
    }

    const photoChanged = pet.photo.url !== petData.photo.url;

    pet.name = petData.name;
    pet.microchipId = petData.microchipId;
    pet.petType = petData.petType;
    pet.breed = petData.breed || "";
    pet.color = petData.color;
    pet.description = petData.description || "";
    pet.photo = petData.photo;
    pet.photo2 = petData.photo2;
    pet.passportPhoto = petData.passportPhoto;
    if (collarWrite.collar) {
      pet.digitalCollar = collarWrite.collar;
    }

    if (photoChanged) {
      pet.processingStatus = "pending";
      pet.hasEmbedding = false;
      await deleteOwnedPetVector(pet._id);
      const enqueueResult = await enqueueOwnedPetProcessing({
        ownedPetId: pet._id.toString(),
        imageUrl: petData.photo.url,
        petType: petData.petType,
      });

      if (!enqueueResult.ok) {
        await markProcessingFailed(pet, enqueueResult.error || "ENQUEUE_FAILED");
      }
    }

    await pet.save();

    const s3Keys = [petData.photo?.s3Key, petData.photo2?.s3Key, petData.passportPhoto?.s3Key].filter(Boolean);
    await markUploadsAttached(s3Keys);

    revalidatePath("/");
    revalidateTagPage(publicId);
    return { success: true };
  });
}

/** Archive a pet (soft-remove from matching). */
export async function archiveOwnedPet(publicId) {
  return withAuthAction("archiveOwnedPet", (session) => setOwnedPetStatus(session, publicId, "archived"));
}

/** Restore an archived pet back to active. */
export async function restoreOwnedPet(publicId) {
  return withAuthAction("restoreOwnedPet", (session) => setOwnedPetStatus(session, publicId, "active"));
}

/** Soft-remove a pet (sets status to removed, deletes vectors). */
export async function removeOwnedPet(publicId) {
  return withAuthAction("removeOwnedPet", (session) => setOwnedPetStatus(session, publicId, "removed"));
}

/** Public Digital Collar contact reveal with Turnstile verification. */
export async function revealTagContactAction(tagPublicId, token) {
  return runTurnstileAction(tagContactSchema, { token }, TURNSTILE_ACTIONS.TAG_CONTACT, async () => {
    await connectDB();
    const result = await revealTagContact(tagPublicId);

    if (!result.ok) {
      return { error: result.error };
    }

    return { success: true, contact: result.contact };
  });
}
