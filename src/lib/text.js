/**
 * Normalizes Persian and Arabic unicode character variations, diacritics, and spaces.
 * @param {string} str
 * @returns {string}
 */
export function normalizePersianArabic(str) {
  if (!str) return "";
  
  return str
    .toLowerCase()
    // 1. Remove Arabic diacritics (Tashkeel: Fatha, Damma, Kasra, Shadda, Sukun, Tanween)
    .replace(/[\u064B-\u0652]/g, "")
    
    // 2. Normalize Alef shapes (أ, إ, آ, ٱ) to standard Alef (ا)
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    
    // 3. Normalize Yeh (Arabic Yeh 'ي' & Alef Maksura 'ى' -> Persian Yeh 'ی')
    .replace(/[\u064A\u0649]/g, "\u06CC")
    
    // 4. Normalize Kaf (Arabic Kaf 'ك' -> Persian Keheh 'ک')
    .replace(/\u0643/g, "\u06A9")
    
    // 5. Normalize Teh Marbuta (ة) to Heh (ه)
    .replace(/\u0629/g, "\u0647")
    
    // 6. Replace ZWNJ (Zero Width Non-Joiner) with standard space to separate compound words
    .replace(/\u200C/g, " ")
    
    .trim();
}

/**
 * Calculates the Levenshtein distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Constructs a RegExp that matches standard Persian and Arabic character variants.
 * Handles Yeh (ی/ي/ى), Kaf (ک/ك), Teh Marbuta (ة/ه), and Alefs (ا/أ/إ/آ/ٱ),
 * as well as stripping Arabic diacritics.
 *
 * @param {string} str The input search term.
 * @returns {RegExp|null} The variant-insensitive RegExp or null if empty.
 */
export function makeVariantInsensitiveRegex(str) {
  if (!str) return null;

  // Escape special regular expression characters to prevent syntax/security errors
  const escaped = str.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");

  const pattern = escaped
    .toLowerCase()
    // 1. Remove Arabic diacritics (Tashkeel)
    .replace(/[\u064B-\u0652]/g, "")
    // 2. Map Alefs to a variant character class matching all forms (ا, أ, إ, آ, ٱ)
    .replace(/[\u0622\u0623\u0625\u0671\u0627]/g, "[\u0622\u0623\u0625\u0671\u0627]")
    // 3. Map Yehs to a variant character class matching Arabic/Persian/Maksura (ی, ي, ى)
    .replace(/[\u064A\u0649\u06CC]/g, "[\u06CC\u064A\u0649]")
    // 4. Map Kafs to a variant character class matching Persian/Arabic Kaf (ک, ك)
    .replace(/[\u0643\u06A9]/g, "[\u06A9\u0643]")
    // 5. Map Teh Marbuta and Heh to a variant character class (ة, ه)
    .replace(/[\u0629\u0647]/g, "[\u0629\u0647]");

  return new RegExp(pattern, "i");
}
