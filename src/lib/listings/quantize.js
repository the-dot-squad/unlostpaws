/** @file Round coordinates so nearby pans share map/browse cache and fetch keys. */

/**
 * @param {number} value
 * @param {number} [decimals=3]
 * @returns {string}
 */
export function quantizeCoord(value, decimals = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(decimals);
}
