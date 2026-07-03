/**
 * Compute bit-level Hamming distance between two perceptual hash hex strings.
 *
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function phashBitDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) {
    return Infinity;
  }

  try {
    const xor = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
    return xor.toString(2).replace(/0/g, "").length;
  } catch {
    return Infinity;
  }
}
