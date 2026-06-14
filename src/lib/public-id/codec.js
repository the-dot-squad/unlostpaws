/**
 * Pure encode/decode for public IDs — no app config, safe to import from scripts.
 *
 * An ObjectId is 96 bits. We XOR its 12 bytes with an entity-specific key
 * (derived from salt + "listing" | "user"), then base62-encode the result.
 * Output is typically 16–17 URL-safe alphanumeric characters.
 */

import { createHmac } from "crypto";
import { ObjectId } from "mongodb";

/** @typedef {"listing" | "user" | "owned-pet"} PublicIdEntity */

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** @param {import("mongodb").ObjectId | string} id */
function toObjectId(id) {
  if (!id) return null;
  const str = String(id);
  return ObjectId.isValid(str) ? new ObjectId(str) : null;
}

/** 12-byte XOR key — different per entity so IDs cannot be reused across routes. */
function entityKey(entity, salt) {
  return createHmac("sha256", salt).update(entity).digest().subarray(0, 12);
}

/** Reversible XOR; applying twice with the same key restores the original bytes. */
function xorBytes(buf, entity, salt) {
  const key = entityKey(entity, salt);
  return Buffer.from(buf.map((byte, i) => byte ^ key[i]));
}

function base62Encode(buf) {
  let n = 0n;
  for (const byte of buf) n = (n << 8n) | BigInt(byte);
  if (n === 0n) return BASE62[0];

  let out = "";
  while (n > 0n) {
    out = BASE62[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}

function base62Decode(str) {
  if (!str || !/^[0-9A-Za-z]+$/.test(str)) return null;

  let n = 0n;
  for (const char of str) {
    const digit = BASE62.indexOf(char);
    if (digit < 0) return null;
    n = n * 62n + BigInt(digit);
  }

  const hex = n.toString(16).padStart(24, "0");
  if (hex.length > 24) return null;

  try {
    return Buffer.from(hex, "hex");
  } catch {
    return null;
  }
}

/**
 * Build a codec bound to a salt. Pass the same salt in scripts and the app.
 * @param {string} salt
 */
export function createPublicIdCodec(salt) {
  return {
    /** @param {PublicIdEntity} entity @param {import("mongodb").ObjectId | string} objectId */
    encode(entity, objectId) {
      const oid = toObjectId(objectId);
      if (!oid) return null;
      return base62Encode(xorBytes(Buffer.from(oid.id), entity, salt));
    },

    /** @param {PublicIdEntity} entity @param {string} publicId @returns {string | null} ObjectId hex */
    decode(entity, publicId) {
      const scrambled = base62Decode(publicId);
      if (!scrambled || scrambled.length !== 12) return null;

      const hex = xorBytes(scrambled, entity, salt).toString("hex");
      return ObjectId.isValid(hex) ? new ObjectId(hex).toString() : null;
    },
  };
}
