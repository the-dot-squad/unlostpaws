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
 * @returns {string}
 */
function buildStreetLine(address) {
  if (!address) return "";

  const parts = [];
  if (address.house_number) parts.push(address.house_number);
  if (address.road) parts.push(address.road);
  else if (address.pedestrian) parts.push(address.pedestrian);
  else if (address.footway) parts.push(address.footway);

  return parts.join(" ").trim();
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
    address: buildStreetLine(address) || payload?.name || "",
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
  const contactEmail = env.nominatim.contactEmail;

  const url = new URL(REVERSE_BASE);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
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
