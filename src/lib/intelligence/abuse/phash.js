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
    let xor = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
    let distance = 0;

    while (xor > 0n) {
      distance += Number(xor & 1n);
      xor >>= 1n;
    }

    return distance;
  } catch {
    return Infinity;
  }
}
