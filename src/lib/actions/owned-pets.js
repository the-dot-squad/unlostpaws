/** @file Owned-pet server actions — register, update, archive. */
"use server";

import { authActionError, requireActiveSession } from "@/lib/auth/session";
import { OwnedPet } from "@/models/owned-pet";
import { getAppSettings } from "@/lib/services/settings";
import { validate, ownedPetSchema } from "@/lib/validation";
import { enqueueOwnedPetProcessing } from "@/lib/intelligence";
import { revalidatePath } from "next/cache";
import { deleteOwnedPetVector } from "@/lib/qdrant";
import { syncOwnedPetStatus } from "@/lib/intelligence/sync-owned-pet-status";
import { encodeOwnedPetPublicId, findOwnedPetByPublicId } from "@/lib/public-id";

async function checkMicrochipUnique(microchipId, excludeId = null) {
  const query = { microchipId, status: { $ne: "removed" } };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await OwnedPet.findOne(query);
  return !existing;
}

function mapOwnedPetValidationError(parsed) {
  if (parsed.ok) return null;
  if (parsed.error === "invalid_format") return "INVALID_MICROCHIP";
  if (parsed.error === "required") return "REQUIRED";
  return "PHOTO_REQUIRED";
}

/** Register a pet, enforce per-user limits, and enqueue ML embedding. */
export async function createOwnedPet(data) {
  try {
    const session = await requireActiveSession();

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

    const enqueueResult = await enqueueOwnedPetProcessing({
      ownedPetId: pet._id.toString(),
      imageUrl: petData.photo.url,
      petType: petData.petType,
    });

    if (!enqueueResult.ok) {
      pet.processingStatus = "failed";
      pet.processingError = enqueueResult.error || "ENQUEUE_FAILED";
      await pet.save();
    }

    revalidatePath("/");
    return { success: true, id: pet.publicId };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Update a registered pet; re-embeds when the primary photo changes. */
export async function updateOwnedPet(publicId, data) {
  try {
    const session = await requireActiveSession();

    const pet = await findOwnedPetByPublicId(publicId, { userId: session.user.id });
    if (!pet) return { error: "NOT_FOUND" };

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
        pet.processingStatus = "failed";
        pet.processingError = enqueueResult.error || "ENQUEUE_FAILED";
      }
    }

    await pet.save();
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Archive a pet (soft-remove from matching). */
export async function archiveOwnedPet(publicId) {
  try {
    const session = await requireActiveSession();

    const pet = await findOwnedPetByPublicId(publicId, { userId: session.user.id });
    if (!pet) return { error: "NOT_FOUND" };

    pet.status = "archived";
    await pet.save();
    await syncOwnedPetStatus(pet._id, "archived");

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Restore an archived pet back to active. */
export async function restoreOwnedPet(publicId) {
  try {
    const session = await requireActiveSession();

    const pet = await findOwnedPetByPublicId(publicId, { userId: session.user.id });
    if (!pet) return { error: "NOT_FOUND" };

    pet.status = "active";
    await pet.save();
    await syncOwnedPetStatus(pet._id, "active");

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}

/** Soft-remove a pet (sets status to removed, deletes vectors). */
export async function removeOwnedPet(publicId) {
  try {
    const session = await requireActiveSession();

    const pet = await findOwnedPetByPublicId(publicId, { userId: session.user.id });
    if (!pet) return { error: "NOT_FOUND" };

    pet.status = "removed";
    await pet.save();
    await syncOwnedPetStatus(pet._id, "removed");

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const authErr = authActionError(err);
    if (authErr) return authErr;
    throw err;
  }
}
