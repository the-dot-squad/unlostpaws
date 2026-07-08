/** @file Coordinate utilities — validation, MongoDB geo queries, and browser geolocation. */

/**
 * @param {number} km
 * @returns {number} Distance in meters.
 */
export function kmToMeters(km) {
  return km * 1000;
}

/**
 * Build a `$geoNear` aggregation stage for proximity search.
 *
 * @param {number} lng
 * @param {number} lat
 * @param {number} maxDistanceMeters
 * @param {object} [extraMatch] Additional query filters.
 * @returns {object[]}
 */
export function buildGeoNearPipeline(lng, lat, maxDistanceMeters, extraMatch = {}) {
  return [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: extraMatch,
      },
    },
  ];
}

/**
 * @param {number} lng
 * @param {number} lat
 * @returns {boolean}
 */
export function isValidCoordinates(lng, lat) {
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    !Number.isNaN(lng) &&
    !Number.isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/** True when the user has explicitly picked coordinates (rejects unset 0,0). */
export function hasSetCoordinates(lng, lat) {
  return isValidCoordinates(lng, lat) && !(lng === 0 && lat === 0);
}

const BROWSER_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

/**
 * Wrap `navigator.geolocation.getCurrentPosition` in a Promise.
 * Requires a secure context (HTTPS or localhost).
 *
 * @param {PositionOptions} [options]
 * @returns {Promise<GeolocationPosition>}
 */
export function getBrowserPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => reject(err),
      { ...BROWSER_GEO_OPTIONS, ...options }
    );
  });
}

/**
 * @param {PositionOptions} [options]
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export async function getBrowserCoordinates(options) {
  const pos = await getBrowserPosition(options);
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };
}
