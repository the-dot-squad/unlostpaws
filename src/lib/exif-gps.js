import exifr from "exifr/dist/lite.esm.mjs";

/**
 * Extract GPS coordinates from an image file's EXIF metadata.
 * Uses the lite browser bundle (no Node fs/zlib dependencies).
 * @param {File} file
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function extractGpsFromImageFile(file) {
  if (!file?.type?.startsWith("image/")) return null;

  try {
    const gps = await exifr.gps(file);
    if (!gps?.latitude || !gps?.longitude) return null;

    const lat = Number(gps.latitude);
    const lng = Number(gps.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}
