import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Strip Mongoose/BSON artifacts for RSC → client props.
 * Converts Mongoose Documents, ObjectIds, Dates, and nested structures into plain JSON objects.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function toPlainObject(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}
