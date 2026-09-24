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
 * Accepts either a canonical key or a legacy localized label.
 *
 * @param {string} breed
 * @param {string} nextPetType
 * @param {(key: string) => string} labelForKey Localized label lookup for a breed slug
 * @returns {boolean}
 */
export function shouldClearBreedForPetType(breed, nextPetType, labelForKey) {
  const trimmed = breed?.trim();
  if (!trimmed) return false;

  const nextKeys = getBreedKeys(nextPetType);
  if (nextKeys.includes(trimmed)) return false;

  const nextLabels = new Set(nextKeys.map(labelForKey));
  if (nextLabels.has(trimmed)) return false;

  for (const keys of Object.values(BREEDS_BY_PET_TYPE)) {
    for (const key of keys) {
      if (key === trimmed || labelForKey(key) === trimmed) return true;
    }
  }
  return false;
}

/**
 * Terms to OR-match for color/breed filters: canonical key plus known locale labels.
 * Custom free-text filters pass through as a single term. No DB migration.
 *
 * @param {"color" | "breed"} kind
 * @param {string} raw Filter value from UI (key, legacy label, or custom text)
 * @param {{ en: Record<string, string>, fa: Record<string, string> }} catalogs Message maps for both locales
 * @returns {string[]}
 */
export function attributeSearchTerms(kind, raw, catalogs) {
  const trimmed = raw?.trim();
  if (!trimmed) return [];

  const keys =
    kind === "color"
      ? getColorKeys()
      : [...new Set(Object.values(BREEDS_BY_PET_TYPE).flat())];

  const terms = new Set([trimmed]);

  const resolveKey =
    keys.find((k) => k === trimmed) ||
    keys.find((k) => catalogs.en?.[k] === trimmed || catalogs.fa?.[k] === trimmed);

  if (resolveKey) {
    terms.add(resolveKey);
    if (catalogs.en?.[resolveKey]) terms.add(catalogs.en[resolveKey]);
    if (catalogs.fa?.[resolveKey]) terms.add(catalogs.fa[resolveKey]);
  }

  return [...terms].filter(Boolean);
}

/**
 * Resolve a stored color/breed for display: catalog key → localized label, else as-is.
 * @param {string | null | undefined} value
 * @param {(key: string) => string} t Translator for colors or breeds (supports `.has` when from next-intl)
 */
export function resolveAttributeLabel(value, t) {
  if (!value) return "";
  if (typeof t?.has === "function" && t.has(value)) return t(value);
  return value;
}
