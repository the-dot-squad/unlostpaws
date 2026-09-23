/** @file Digital Collar eligibility and public tag view helpers. */

import { getAuthUserById } from "@/lib/auth/users";
import {
  isDigitalCollarEligible,
  normalizeDigitalCollar,
} from "@/lib/pets/digital-collar-shared";
import { findOwnedPetByPublicId } from "@/lib/public-id";
import { serializeOwnedPetMedia } from "@/models/owned-pet";

export { isDigitalCollarEligible, normalizeDigitalCollar };

/**
 * Load a pet for the public tag page.
 * @param {string} publicId
 * @returns {Promise<
 *   | { kind: "missing" }
 *   | { kind: "active" | "inactive"; pet: object; owner: object | null; collar: ReturnType<typeof normalizeDigitalCollar> }
 * >}
 */
export async function resolveTagPage(publicId) {
  const pet = await findOwnedPetByPublicId(publicId, { status: { $ne: "removed" } });
  if (!pet) return { kind: "missing" };

  const owner = await getAuthUserById(pet.userId);
  const collar = normalizeDigitalCollar(pet);
  const eligible = isDigitalCollarEligible(pet, owner);

  return {
    kind: eligible ? "active" : "inactive",
    pet,
    owner,
    collar,
  };
}

/**
 * Safe fields for the public tag page (never includes the microchip number).
 * @param {object} pet
 * @param {{ includeEmergency?: boolean }} [options]
 */
export function serializePublicTagPet(pet, { includeEmergency = false } = {}) {
  const media = serializeOwnedPetMedia(pet);
  const collar = normalizeDigitalCollar(pet);
  const microchipId = typeof pet.microchipId === "string" ? pet.microchipId.trim() : "";
  const base = {
    publicId: pet.publicId,
    name: pet.name,
    petType: pet.petType,
    breed: pet.breed || "",
    color: pet.color,
    photo: media.photo,
    hasMicrochip: Boolean(microchipId),
  };

  if (!includeEmergency) return base;

  return {
    ...base,
    medicalAlerts: collar.medicalAlerts.trim(),
    allowEmail: collar.allowEmail,
    allowPhone: collar.allowPhone,
  };
}
