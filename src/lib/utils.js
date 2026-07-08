import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Strip Mongoose/BSON artifacts for RSC → client props.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function toPlainObject(value) {
  if (value == null) return value;

  if (typeof value.toObject === "function") {
    return toPlainObject(value.toObject({ flattenMaps: true, versionKey: false }));
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object") {
    const tag = Object.prototype.toString.call(value);

    if (tag === "[object ObjectId]" || typeof value.toHexString === "function") {
      return String(value);
    }

    if (value instanceof Map) {
      return Object.fromEntries(
        Array.from(value.entries(), ([key, entry]) => [key, toPlainObject(entry)]),
      );
    }

    if (Array.isArray(value)) {
      return value.map((item) => toPlainObject(item));
    }

    if (tag === "[object Object]") {
      const result = {};
      for (const [key, entry] of Object.entries(value)) {
        result[key] = toPlainObject(entry);
      }
      return result;
    }
  }

  return value;
}
