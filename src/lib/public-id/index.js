/**
 * Public IDs for user-facing URLs.
 */

import { ObjectId } from "mongodb";
import { connectDB, getMongoDb } from "@/config/db";
import { env } from "@/config/env";
import { normalizeAuthUser } from "@/lib/auth/users";
import { isPremium } from "@/lib/premium/entitlements";
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

/**
 * Resolves the preferred public URL identifier for a user.
 * - If Premium and has a custom username, returns their username.
 * - Otherwise returns their generated publicId.
 * @param {object} user
 * @returns {string}
 */
export function getUserPublicIdentifier(user) {
  if (!user) return "";
  if (isPremium(user) && user.handle?.username) {
    return user.handle.username;
  }
  return user.handle?.publicId || user.publicId || user.id || "";
}

/**
 * Resolves the user's handle/publicId display string.
 * - If Premium and has custom username -> "@username"
 * - Otherwise -> "usr_..." (publicId)
 * @param {object} user
 * @returns {string}
 */
export function getUserHandleDisplay(user) {
  if (!user) return "";
  if (isPremium(user) && user.handle?.username) {
    return `@${user.handle.username}`;
  }
  return user.handle?.publicId || user.publicId || "";
}

export { RESERVED_USERNAMES } from "@/config/constants/usernames";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findUserByPublicId(identifier, projection) {
  if (!identifier || typeof identifier !== "string") return null;

  const raw = identifier.trim();
  const clean = raw.toLowerCase().replace(/^@/, "");
  const db = await getMongoDb();

  const safeClean = escapeRegex(clean);
  const safeRaw = escapeRegex(raw);

  const clauses = [
    { publicId: raw },
    { publicId: clean },
    { "handle.publicId": raw },
    { "handle.publicId": clean },
    { "handle.username": clean },
    { "handle.username": { $regex: new RegExp(`^${safeClean}$`, "i") } },
    { handle: { $regex: new RegExp(`"username"\\s*:\\s*"${safeClean}"`, "i") } },
    { handle: { $regex: new RegExp(`"publicId"\\s*:\\s*"${safeRaw}"`, "i") } },
    { handle: clean },
    { handle: raw },
    { username: clean },
    { _id: raw },
    { id: raw },
  ];

  if (ObjectId.isValid(clean)) {
    clauses.push({ _id: new ObjectId(clean) }, { id: clean });
  }

  const user = await db.collection("user").findOne({ $or: clauses }, { projection });
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
