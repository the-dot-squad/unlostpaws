/** @file Client-safe Digital Collar helpers (no DB / auth imports). */

import { isPremium } from "@/lib/premium/entitlements";

/** @param {object | null | undefined} pet */
export function normalizeDigitalCollar(pet) {
  const collar = pet?.digitalCollar;
  return {
    enabled: Boolean(collar?.enabled),
    allowEmail: collar?.allowEmail !== false,
    allowPhone: Boolean(collar?.allowPhone),
    medicalAlerts: typeof collar?.medicalAlerts === "string" ? collar.medicalAlerts : "",
  };
}

/**
 * Public emergency page is live only when pet is active, collar enabled, and owner has Premium.
 * @param {object | null | undefined} pet
 * @param {object | null | undefined} owner
 */
export function isDigitalCollarEligible(pet, owner) {
  if (!pet || pet.status !== "active") return false;
  if (!normalizeDigitalCollar(pet).enabled) return false;
  return isPremium(owner);
}
