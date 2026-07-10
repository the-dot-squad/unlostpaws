/** @file Thin Telegram Bot API client — fetch-based, no external SDK. */

import { env } from "@/config/env";

const API_BASE = "https://api.telegram.org";

/**
 * @typedef {object} TelegramApiResponse
 * @property {boolean} ok
 * @property {*} [result]
 * @property {string} [description]
 * @property {number} [error_code]
 */

/**
 * Call a Telegram Bot API method.
 *
 * @param {string} method — e.g. "sendMessage", "sendMediaGroup"
 * @param {Record<string, unknown>} body — JSON-serializable request body
 * @returns {Promise<TelegramApiResponse>}
 */
export async function callTelegramApi(method, body) {
  if (!env.telegram.enabled) {
    return { ok: false, description: "Telegram not configured" };
  }

  const url = `${API_BASE}/bot${env.telegram.botToken}/${method}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    /** @type {TelegramApiResponse} */
    const data = await response.json();

    if (!data.ok) {
      console.error(`Telegram ${method} failed:`, data.description || response.statusText);
    }

    return data;
  } catch (err) {
    console.error(`Telegram ${method} request error:`, err.message);
    return { ok: false, description: err.message };
  }
}

/**
 * Send a photo media group to the configured channel.
 *
 * @param {object} params
 * @param {string} params.chatId
 * @param {Array<{ type: "photo", media: string, caption?: string, parse_mode?: string }>} params.media
 */
export function sendMediaGroup({ chatId, media }) {
  return callTelegramApi("sendMediaGroup", { chat_id: chatId, media });
}

/**
 * Send a text message with an optional inline keyboard.
 *
 * @param {object} params
 * @param {string} params.chatId
 * @param {string} params.text
 * @param {object} [params.replyMarkup] — inline_keyboard shape
 */
export function sendMessage({ chatId, text, replyMarkup }) {
  const body = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  return callTelegramApi("sendMessage", body);
}

/** @returns {string} Configured channel ID or empty string. */
export function getTelegramChannelId() {
  return env.telegram.channelId;
}
