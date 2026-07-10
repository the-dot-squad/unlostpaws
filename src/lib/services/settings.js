/** @file Singleton app settings — cached reads and validated updates. */

import { connectDB } from "@/config/db";
import { AppSettings } from "@/models/app-settings";
import { appSettingsSchema, validate } from "@/lib/validation";
import { normalizeSocialLinkArray } from "@/lib/socials";

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

  settings.socialLinks = normalizeSocialLinkArray(settings.socialLinks);

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
  if (data && typeof data === "object" && "socialLinks" in data) {
    data.socialLinks = normalizeSocialLinkArray(data.socialLinks);
  }

  const parsed = validate(appSettingsSchema, data);
  if (!parsed.ok) {
    const detail = parsed.field ? `${parsed.field} (${parsed.error})` : parsed.error;
    return { error: `Validation failed: ${detail}` };
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
