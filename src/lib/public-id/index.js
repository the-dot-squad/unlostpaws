/**
 * Public IDs for user-facing URLs.
 */

import { connectDB, getMongoDb } from "@/config/db";
import { env } from "@/config/env";
import { normalizeAuthUser } from "@/lib/auth/users";
import { Listing } from "@/models/listing";
import { OwnedPet } from "@/models/owned-pet";
import { createPublicIdCodec } from "./codec.js";
import {
  decodeListingPublicId,
  encodeListingPublicId,
  isValidListingPublicId,
  listingPublicPath,
} from "./listing.js";
import { createOwnedPetPublicIdCodec } from "./owned-pet.js";

export { encodeListingPublicId, decodeListingPublicId, isValidListingPublicId, listingPublicPath };

const codec = createPublicIdCodec(env.publicId.salt);
const ownedPetIds = createOwnedPetPublicIdCodec(env.publicId.salt);

export const {
  encodeOwnedPetPublicId,
  decodeOwnedPetPublicId,
  isValidOwnedPetPublicId,
  ownedPetPublicPath,
} = ownedPetIds;

/** @typedef {import("./codec.js").PublicIdEntity} PublicIdEntity */

/** @param {PublicIdEntity} entity @param {import("mongodb").ObjectId | string} objectId */
export function encodePublicId(entity, objectId) {
  return codec.encode(entity, objectId);
}

/** @param {PublicIdEntity} entity @param {string} publicId @returns {string | null} */
export function decodePublicId(entity, publicId) {
  return codec.decode(entity, publicId);
}

/** @param {PublicIdEntity} entity @param {string} publicId */
export function isValidPublicId(entity, publicId) {
  return decodePublicId(entity, publicId) !== null;
}

/** @param {string} publicId @param {object} [extraFilter] */
export async function findListingByPublicId(publicId, extraFilter = {}) {
  if (!isValidListingPublicId(publicId)) {
    return null;
  }

  const objectId = decodeListingPublicId(publicId);
  await connectDB();
  return Listing.findOne({ _id: objectId, ...extraFilter });
}

/** @param {string} publicId @param {object} [extraFilter] */
export async function findOwnedPetByPublicId(publicId, extraFilter = {}) {
  if (!isValidOwnedPetPublicId(publicId)) {
    return null;
  }

  await connectDB();
  return OwnedPet.findOne({ publicId, ...extraFilter });
}

/** @param {import("mongodb").ObjectId | string} userId */
export function encodeUserPublicId(userId) {
  return encodePublicId("user", userId);
}

/** @param {string} publicId @param {object} [projection] MongoDB projection */
export async function findUserByPublicId(publicId, projection) {
  if (!isValidPublicId("user", publicId)) return null;

  const db = await getMongoDb();
  const user = await db.collection("user").findOne({ publicId }, { projection });
  return user ? normalizeAuthUser(user) : null;
}

export { userPath as userPublicPath } from "@/lib/paths";

/** Resolve owned-pet publicId from stored value or deterministic encode from _id. */
export function resolveOwnedPetPublicId(pet) {
  if (!pet) return pet;
  const id = pet._id?.toString?.() ?? pet._id;
  return {
    ...pet,
    publicId: pet.publicId || encodeOwnedPetPublicId(id),
  };
}
