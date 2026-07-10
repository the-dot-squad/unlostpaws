/** @file Post approved listings to the configured Telegram channel. */

import "server-only";

import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { getAuthUserById } from "@/lib/auth/users";
import {
  buildTelegramListingCaption,
  getListingImageUrls,
  normalizeTelegramLocale,
  TELEGRAM_CAPTION_PARSE_MODE,
} from "./format-listing";
import { getTelegramChannelId, sendMediaGroup } from "./client";

/** Listing types eligible for Telegram channel posts. */
const TELEGRAM_POST_TYPES = new Set(["missing", "surrender"]);

/**
 * Resolve the locale for outbound Telegram copy.
 * Prefers the locale stored on the listing (UI language at create time),
 * then falls back to the owner's profile locale.
 *
 * @param {object} listing
 * @returns {Promise<"en" | "fa">}
 */
async function resolveListingLocale(listing) {
  if (listing.locale === "fa" || listing.locale === "en") {
    return listing.locale;
  }

  const owner = await getAuthUserById(listing.userId);
  return normalizeTelegramLocale(owner?.locale);
}

/**
 * Whether a listing should be posted to Telegram after ML ingest.
 * @param {object} listing
 * @returns {boolean}
 */
export function shouldPostListingToTelegram(listing) {
  if (!env.telegram.enabled) return false;
  if (listing.status !== "active") return false;
  if (listing.telegramPostedAt) return false;
  if (!TELEGRAM_POST_TYPES.has(listing.type)) return false;
  return getListingImageUrls(listing).length > 0;
}

/**
 * Post a listing to the Telegram channel with photos and a single caption.
 *
 * Idempotent: uses an atomic `telegramPostedAt` update so reprocessing
 * or concurrent callbacks cannot duplicate posts.
 *
 * @param {object} listing — Mongoose document (mutated in place on success)
 * @returns {Promise<{ posted: boolean, reason?: string }>}
 */
export async function postListingToTelegram(listing) {
  if (!shouldPostListingToTelegram(listing)) {
    return { posted: false, reason: "not_eligible" };
  }

  const locale = await resolveListingLocale(listing);
  const chatId = getTelegramChannelId();
  const imageUrls = getListingImageUrls(listing);
  const caption = await buildTelegramListingCaption(listing, locale);

  const media = imageUrls.map((url, index) => ({
    type: "photo",
    media: url,
    ...(index === 0 ? { caption, parse_mode: TELEGRAM_CAPTION_PARSE_MODE } : {}),
  }));

  const groupResult = await sendMediaGroup({ chatId, media });
  if (!groupResult.ok) {
    return { posted: false, reason: groupResult.description || "sendMediaGroup_failed" };
  }

  await connectDB();
  const updated = await Listing.findOneAndUpdate(
    { _id: listing._id, telegramPostedAt: { $exists: false } },
    { $set: { telegramPostedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (updated) {
    listing.telegramPostedAt = updated.telegramPostedAt;
    return { posted: true };
  }

  return { posted: false, reason: "already_posted" };
}

/**
 * Fire-and-forget wrapper for ingest — never throws.
 * @param {object} listing
 */
export async function tryPostListingToTelegram(listing) {
  try {
    await postListingToTelegram(listing);
  } catch (err) {
    console.error("Telegram listing post failed:", err.message);
  }
}
