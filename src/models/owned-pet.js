/** @file Private registered pet — auth-gated account registry for owner AI match suggestions. */

import mongoose from "mongoose";
import { OWNED_PET_STATUSES, PET_TYPES, PROCESSING_STATUSES } from "@/config/constants/enums";
import { resolveImageUrl } from "@/lib/storage/urls";

const imageSchema = new mongoose.Schema(
  {
    s3Key: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const ownedPetSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true, sparse: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    microchipId: { type: String, required: true, unique: true, index: true },
    petType: { type: String, enum: PET_TYPES, required: true, index: true },
    breed: { type: String, default: "" },
    color: { type: String, required: true },
    description: { type: String, default: "" },
    photo: { type: imageSchema, required: true },
    photo2: { type: imageSchema },
    passportPhoto: { type: imageSchema },
    hasEmbedding: { type: Boolean, default: false },
    embeddingModel: { type: String, default: "" },
    processingStatus: {
      type: String,
      enum: PROCESSING_STATUSES,
      default: "pending",
    },
    processingError: { type: String, default: "" },
    status: { type: String, enum: OWNED_PET_STATUSES, default: "active", index: true },
    adminNote: { type: String, default: "" },
    linkedListingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
  },
  { timestamps: true }
);

ownedPetSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const OwnedPet =
  mongoose.models.OwnedPet || mongoose.model("OwnedPet", ownedPetSchema);

/** Strip Mongoose artifacts from photo fields passed to client components. */
export function serializeOwnedPetMedia(pet) {
  if (!pet) return { photo: null, photo2: null, passportPhoto: null };

  return {
    photo: pet.photo ? { url: resolveImageUrl(pet.photo) } : null,
    photo2: pet.photo2 ? { url: resolveImageUrl(pet.photo2) } : null,
    passportPhoto: pet.passportPhoto ? { url: resolveImageUrl(pet.passportPhoto) } : null,
  };
}
