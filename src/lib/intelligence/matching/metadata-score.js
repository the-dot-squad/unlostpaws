import { levenshteinDistance, normalizePersianArabic } from "../../text.js";

/**
 * Token overlap scoring for listing metadata (breed, color, description).
 */

/**
 * Normalizes and splits a string into a set of lowercased tokens.
 *
 * @param {string} value
 * @returns {Set<string>}
 */
export function tokenize(value) {
  if (!value) {
    return new Set();
  }

  return new Set(
    normalizePersianArabic(value)
      .split(/[\s,/\-]+/)
      .map((t) => t.trim())
      .filter(Boolean)
  );
}

/**
 * Calculates a fuzzy Jaccard similarity score between two token sets.
 * Performs exact matching first, and matches remaining unmatched tokens using
 * Levenshtein distance according to length-dependent allowed edit distance thresholds.
 *
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
export function jaccard(a, b) {
  if (!a.size && !b.size) {
    return 0;
  }

  const listB = Array.from(b);
  const usedB = new Set();
  let intersection = 0;

  // 1. Try exact matches first
  for (const tokenA of a) {
    if (b.has(tokenA)) {
      intersection += 1;
      usedB.add(tokenA);
    }
  }

  // 2. Try fuzzy matches for remaining tokens
  for (const tokenA of a) {
    if (b.has(tokenA)) continue; // already matched exactly

    let bestMatch = null;
    let minDistance = Infinity;

    for (const tokenB of listB) {
      if (usedB.has(tokenB)) continue;

      const len = Math.max(tokenA.length, tokenB.length);
      if (len === 0) continue;

      const dist = levenshteinDistance(tokenA, tokenB);

      // Allowed edit distance thresholds based on token length:
      // - length < 4: exact matches only
      // - length 4 to 7: max 1 edit distance allowed
      // - length >= 8: max 2 edit distance allowed
      let maxAllowed = 0;
      if (len >= 8) {
        maxAllowed = 2;
      } else if (len >= 4) {
        maxAllowed = 1;
      }

      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        bestMatch = tokenB;
      }
    }

    if (bestMatch !== null) {
      intersection += 1;
      usedB.add(bestMatch);
    }
  }

  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

/**
 * Score breed + color overlap between two listings (0–1).
 *
 * @param {Object} source
 * @param {Object} candidate
 */
export function metadataScore(source, candidate) {
  const breedScore = jaccard(tokenize(source.breed), tokenize(candidate.breed));
  const colorScore = jaccard(tokenize(source.color), tokenize(candidate.color));

  if (!source.breed && !candidate.breed) {
    return colorScore;
  }

  return breedScore * 0.4 + colorScore * 0.6;
}

/**
 * Description-only token overlap (0–1).
 *
 * @param {Object} a
 * @param {Object} b
 */
export function descriptionOverlap(a, b) {
  return jaccard(tokenize(a.description), tokenize(b.description));
}
