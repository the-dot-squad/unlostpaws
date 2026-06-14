import {
  deleteOwnedPetVector,
  updateOwnedPetStatus as updateQdrantOwnedPetStatus,
} from "@/lib/qdrant/owned-pets";

/**
 * Keep Qdrant owned-pet vectors aligned when MongoDB status changes.
 *
 * @param {import('mongoose').Types.ObjectId|string} ownedPetId
 * @param {string} status
 */
export async function syncOwnedPetStatus(ownedPetId, status) {
  if (status === "removed") {
    await deleteOwnedPetVector(ownedPetId);
    return;
  }

  await updateQdrantOwnedPetStatus(ownedPetId, status);
}
