/** @file Owned-pet domain helpers shared by actions and admin. */

import { OwnedPet } from "@/models/owned-pet";

/**
 * Check whether a microchip ID is available.
 * @param {string} microchipId
 * @param {import("mongoose").Types.ObjectId | string | null} [excludeId]
 */
export async function checkMicrochipUnique(microchipId, excludeId = null) {
  const query = { microchipId, status: { $ne: "removed" } };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await OwnedPet.findOne(query);
  return !existing;
}
