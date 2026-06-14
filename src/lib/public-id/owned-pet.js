/**
 * Owned-pet public IDs — stored on document, same codec as listings/users.
 */

import { ownedPetPath } from "@/lib/paths";
import { createPublicIdCodec } from "./codec.js";

/** @param {string} salt */
export function createOwnedPetPublicIdCodec(salt) {
  const codec = createPublicIdCodec(salt);

  return {
    encodeOwnedPetPublicId(objectId) {
      return codec.encode("owned-pet", objectId);
    },

    decodeOwnedPetPublicId(publicId) {
      return codec.decode("owned-pet", publicId);
    },

    isValidOwnedPetPublicId(publicId) {
      return codec.decode("owned-pet", publicId) !== null;
    },

    ownedPetPublicPath: ownedPetPath,
  };
}
