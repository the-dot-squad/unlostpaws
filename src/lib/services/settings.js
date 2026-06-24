/** @file Singleton app settings — cached reads and validated updates. */

import { connectDB } from "@/config/db";
import { AppSettings } from "@/models/app-settings";
import { appSettingsSchema, validate } from "@/lib/validation";

const CACHE_TTL_MS = 60_000;

/** @type {{ doc: import("mongoose").Document | null, expiresAt: number }} */
const cache = { doc: null, expiresAt: 0 };

/** Drop cached settings (after admin update). */
export function invalidateAppSettingsCache() {
  cache.doc = null;
  cache.expiresAt = 0;
}

/**
 * Load singleton app settings (upsert-safe, 60s in-memory cache).
 * @returns {Promise<import("mongoose").Document>}
 */
export async function getAppSettings() {
  const now = Date.now();
  if (cache.doc && cache.expiresAt > now) {
    return cache.doc;
  }

  await connectDB();

  const settings = await AppSettings.findOneAndUpdate(
    { singleton: "default" },
    { $setOnInsert: { singleton: "default" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  cache.doc = settings;
  cache.expiresAt = now + CACHE_TTL_MS;
  return settings;
}

/**
 * Validate and persist admin settings.
 * @param {unknown} data
 * @returns {Promise<{ success: true } | { error: string }>}
 */
export async function updateAppSettings(data) {
  const parsed = validate(appSettingsSchema, data);
  if (!parsed.ok) {
    return { error: "Validation failed" };
  }

  await connectDB();

  await AppSettings.findOneAndUpdate(
    { singleton: "default" },
    { $set: parsed.data },
    { upsert: true, setDefaultsOnInsert: true }
  );

  invalidateAppSettingsCache();
  return { success: true };
}
