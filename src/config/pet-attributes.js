/** @file Helpers for breed/color suggestion catalogs. */

import { BREEDS_BY_PET_TYPE } from "@/config/constants/breeds";
import { PET_COLORS } from "@/config/constants/colors";

/**
 * @param {string} [petType]
 * @returns {string[]}
 */
export function getBreedKeys(petType) {
  if (!petType) return [];
  return BREEDS_BY_PET_TYPE[petType] ?? [];
}

/**
 * @returns {string[]}
 */
export function getColorKeys() {
  return PET_COLORS;
}

/**
 * Clear breed when it was a catalog suggestion that the new pet type does not support.
 * Custom free-text and labels still offered for the new type are kept.
 *
 * @param {string} breed
 * @param {string} nextPetType
 * @param {(key: string) => string} labelForKey Localized label lookup for a breed slug
 * @returns {boolean}
 */
export function shouldClearBreedForPetType(breed, nextPetType, labelForKey) {
  const trimmed = breed?.trim();
  if (!trimmed) return false;

  const nextLabels = new Set(getBreedKeys(nextPetType).map(labelForKey));
  if (nextLabels.has(trimmed)) return false;

  for (const keys of Object.values(BREEDS_BY_PET_TYPE)) {
    for (const key of keys) {
      if (labelForKey(key) === trimmed) return true;
    }
  }
  return false;
}
