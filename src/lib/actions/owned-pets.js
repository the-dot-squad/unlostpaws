/** @file Owned-pet server actions — register, update, archive. */
"use server";

import { withAuthAction } from "@/lib/auth/session";
import { requireOwnedPet } from "@/lib/actions/require-owned";
import { OwnedPet } from "@/models/owned-pet";
import { getAppSettings } from "@/lib/services/settings";
import { checkMicrochipUnique } from "@/lib/services/owned-pets";
import { validate, ownedPetSchema } from "@/lib/validation";
import { enqueueOwnedPetProcessing } from "@/lib/intelligence";
import { markProcessingFailed } from "@/lib/intelligence/processing-failure";
import { revalidatePath } from "next/cache";
import { deleteOwnedPetVector } from "@/lib/qdrant";
import { syncOwnedPetStatus } from "@/lib/intelligence/sync-owned-pet-status";
import { encodeOwnedPetPublicId } from "@/lib/public-id";
import { markUploadsAttached } from "@/lib/storage/cleanup";

function mapOwnedPetValidationError(parsed) {
  if (parsed.ok) return null;
  if (parsed.error === "invalid_format") return "INVALID_MICROCHIP";
  if (parsed.error === "required") return "REQUIRED";
  return "PHOTO_REQUIRED";
}

async function setOwnedPetStatus(session, publicId, status) {
  const owned = await requireOwnedPet(session, publicId);
  if (owned.error) return owned;

  owned.pet.status = status;
  await owned.pet.save();
  await syncOwnedPetStatus(owned.pet._id, status);

  revalidatePath("/");
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
