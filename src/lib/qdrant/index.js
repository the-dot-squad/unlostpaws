export {
  COLLECTIONS,
  ensureCollections,
  getQdrantClient,
  normalizeVector,
  toPointId,
  fromPointId,
  truncateMlCollections,
  isQdrantNotFoundError,
} from "@/lib/qdrant/client";

export {
  upsertListingImageVector,
  updateListingImageStatus,
  updateListingImageStatusBulk,
  deleteListingImageVectorsByListingId,
  searchListingImages,
  getListingImageVectors,
} from "@/lib/qdrant/listing-images";

export {
  upsertOwnedPetVector,
  deleteOwnedPetVector,
  updateOwnedPetStatus,
  searchOwnedPets,
} from "@/lib/qdrant/owned-pets";
