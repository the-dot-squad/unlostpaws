import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Strip Mongoose/ObjectId artifacts for RSC → client props.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function toPlainObject(value) {
  if (value == null) return value;
  return structuredClone(value);
}
