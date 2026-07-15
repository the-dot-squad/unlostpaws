/** @file Nominatim reverse geocoding client. */

import { env } from "@/config/env";

const REVERSE_BASE = "https://nominatim.openstreetmap.org/reverse";

/**
 * @typedef {object} ReverseGeocodeResult
 * @property {string} address Street-level line.
 * @property {string} city
 * @property {string} country ISO 3166-1 alpha-2 (e.g. "US").
 * @property {string} displayName Full Nominatim display name.
 */

/**
 * @typedef {object} NominatimFailure
 * @property {false} ok
 * @property {"not_found" | "upstream" | "unavailable"} code
 * @property {string} message
 */

/**
 * @typedef {object} NominatimSuccess
 * @property {true} ok
 * @property {ReverseGeocodeResult} data
 */

/**
 * @param {Record<string, string>|undefined} address
 * @param {string|undefined} payloadName
 * @returns {string}
 */
function buildStreetLine(address, payloadName) {
  if (!address) return "";

  const parts = [];

  // 1. POI / Building / Amenity name
  const poiKeys = [
    "amenity",
    "shop",
    "tourism",
    "leisure",
    "building",
    "office",
    "historic",
    "craft",
    "place",
    "railway",
    "aeroway",
  ];

  let poiName = "";
  for (const key of poiKeys) {
    if (address[key] && address[key] !== address.road) {
      poiName = address[key];
      break;
    }
  }

  const nameLower = String(payloadName || "").toLowerCase().trim();
  const roadLower = String(address.road || "").toLowerCase().trim();
  const cityLower = String(address.city || "").toLowerCase().trim();
  const countyLower = String(address.county || "").toLowerCase().trim();
  const stateLower = String(address.state || "").toLowerCase().trim();
  const countryLower = String(address.country || "").toLowerCase().trim();
  const postcodeLower = String(address.postcode || "").toLowerCase().trim();

  if (
    !poiName &&
    payloadName &&
    nameLower !== roadLower &&
    nameLower !== cityLower &&
    nameLower !== countyLower &&
    nameLower !== stateLower &&
    nameLower !== countryLower &&
    nameLower !== postcodeLower
  ) {
    poiName = payloadName;
  }

  if (poiName) {
    parts.push(poiName);
  }

  // 2. House number & Road/Street
  const streetParts = [];
  if (address.house_number) {
    streetParts.push(address.house_number);
  }

  const roadName =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.cycleway ||
    address.square;
  if (roadName) {
    streetParts.push(roadName);
  }

  if (streetParts.length > 0) {
    parts.push(streetParts.join(" "));
  }

  // 3. Neighborhood / Suburb / Quarter (adds local context)
  const neighborhood =
    address.neighbourhood || address.suburb || address.quarter || address.city_district;
  if (neighborhood && neighborhood !== address.city && !parts.includes(neighborhood)) {
    parts.push(neighborhood);
  }

  return parts.join(", ").trim();
}

/**
 * @param {Record<string, string>|undefined} address
 * @returns {string}
 */
function pickCity(address) {
  if (!address) return "";
  return (
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    address.municipality ||
    address.county ||
    ""
  );
}

/**
 * @param {object} payload Nominatim jsonv2 response body.
 * @returns {ReverseGeocodeResult}
 */
function parseReverseGeocode(payload) {
  const address = payload?.address || {};

  return {
    address: buildStreetLine(address, payload?.name) || "",
    city: pickCity(address),
    country: (address.country_code || "").toUpperCase(),
    displayName: payload?.display_name || "",
  };
}

/**
 * Reverse geocode coordinates via the Nominatim API.
 * @see https://nominatim.org/release-docs/develop/api/Reverse/
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<NominatimSuccess | NominatimFailure>}
 */
export async function reverseGeocode(lat, lng) {
  // Round coordinates to 4 decimal places to reduce geocoding errors and better caching
  const roundedLat = Math.round(Number(lat) * 10000) / 10000;
  const roundedLng = Math.round(Number(lng) * 10000) / 10000;
  const contactEmail = env.nominatim.contactEmail;

  const url = new URL(REVERSE_BASE);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(roundedLat));
  url.searchParams.set("lon", String(roundedLng));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("email", contactEmail);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": `UnLostPaws/1.0 (${contactEmail})`,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return { ok: false, code: "upstream", message: "Geocoding failed" };
    }

    const data = await res.json();
    if (data?.error) {
      return { ok: false, code: "not_found", message: data.error };
    }

    return { ok: true, data: parseReverseGeocode(data) };
  } catch (err) {
    console.error("Nominatim reverse geocode error:", err.message);
    return { ok: false, code: "unavailable", message: "Geocoding unavailable" };
  }
}
