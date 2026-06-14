/** @file Cross-type pair rules and canonical listing pair keys. */

/**
 * @param {import("mongoose").Types.ObjectId | string} idA
 * @param {import("mongoose").Types.ObjectId | string} idB
 * @returns {[string, string]}
 */
export function canonicalListingPair(idA, idB) {
  const a = String(idA);
  const b = String(idB);
  return a < b ? [a, b] : [b, a];
}

/** @param {string} typeA @param {string} typeB */
export function isCrossTypePair(typeA, typeB) {
  return Boolean(typeA && typeB && typeA !== typeB);
}

/** @param {string} typeA @param {string} typeB @returns {"reunification"|"corroboration"|null} */
export function matchTierForTypes(typeA, typeB) {
  if (!isCrossTypePair(typeA, typeB)) return null;
  if (typeA === "missing" || typeB === "missing") return "reunification";
  return "corroboration";
}

/** @param {object} settings @param {string} typeA @param {string} typeB */
export function thresholdForPair(settings, typeA, typeB) {
  const base = settings.matchSimilarityThreshold ?? 0.82;
  if (matchTierForTypes(typeA, typeB) === "corroboration") {
    return base * (settings.corroborationThresholdMultiplier ?? 1.1);
  }
  return base;
}
