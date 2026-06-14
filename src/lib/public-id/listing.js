/**
 * Listing public IDs — deterministic URL slugs from MongoDB `_id`.
 * Never stored in MongoDB; always computed at read time.
 */

import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { createPublicIdCodec } from "./codec.js";

const codec = createPublicIdCodec(env.publicId.salt);

/** @param {import("mongodb").ObjectId | string} objectId */
export function encodeListingPublicId(objectId) {
  const id = codec.encode("listing", objectId);
  if (!id) {
    throw new Error("Invalid listing id for public encoding");
  }
  return id;
}

/** @param {string} publicId @returns {string | null} ObjectId hex */
export function decodeListingPublicId(publicId) {
  const hex = codec.decode("listing", publicId);
  if (!hex || !ObjectId.isValid(hex)) {
    return null;
  }
  return hex;
}

/** @param {string} publicId */
export function isValidListingPublicId(publicId) {
  return decodeListingPublicId(publicId) !== null;
}

export { listingPath as listingPublicPath } from "@/lib/paths";
