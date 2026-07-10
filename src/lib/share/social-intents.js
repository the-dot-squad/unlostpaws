/**
 * @file Stable third-party share-intent URL builders (not deployment-specific).
 *
 * Endpoints verified against current platform docs:
 * - WhatsApp: https://faq.whatsapp.com/5913398998672934 (wa.me click-to-chat)
 * - Telegram: https://core.telegram.org/widgets/share
 * - Facebook: https://www.facebook.com/sharer.php (no app registration required)
 * - X: https://developer.x.com/en/docs/x-for-websites/web-intents/overview (x.com/intent/post)
 */

const SHARE_HOSTS = {
  whatsApp: "wa.me",
  telegram: "t.me",
  facebook: "www.facebook.com",
  x: "x.com",
};

/** @param {string} host */
function originFor(host) {
  return new URL("/", `https://${host}`).origin;
}

/** @param {string} url */
export function openSharePopup(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * WhatsApp click-to-chat with a pre-filled message (no phone number).
 * Opens contact picker so the user chooses who to forward the listing to.
 *
 * @param {{ text: string }} params
 * @see https://faq.whatsapp.com/5913398998672934
 */
export function buildWhatsAppShareUrl({ text }) {
  const url = new URL("/", originFor(SHARE_HOSTS.whatsApp));
  url.searchParams.set("text", text);
  return url.toString();
}

/**
 * Telegram share widget — user picks a chat and can edit the message before sending.
 *
 * @param {{ url: string, text: string }} params
 * @see https://core.telegram.org/widgets/share
 */
export function buildTelegramShareUrl({ url: pageUrl, text }) {
  const url = new URL("/share/url", originFor(SHARE_HOSTS.telegram));
  url.searchParams.set("url", pageUrl);
  url.searchParams.set("text", text);
  return url.toString();
}

/**
 * Facebook link share — opens Facebook's share UI for the user's own account.
 * No Facebook App ID or SDK required.
 *
 * @param {{ url: string }} params
 */
export function buildFacebookShareUrl({ url: pageUrl }) {
  const url = new URL("/sharer.php", originFor(SHARE_HOSTS.facebook));
  url.searchParams.set("u", pageUrl);
  return url.toString();
}

/**
 * X post composer (formerly Twitter Web Intent).
 *
 * `twitter.com/intent/tweet` still redirects, but `x.com/intent/post` is the current host.
 *
 * @param {{ url: string, text: string }} params
 * @see https://developer.x.com/en/docs/x-for-websites/tweet-button/guides/parameter-reference1
 */
export function buildXShareUrl({ url: pageUrl, text }) {
  const url = new URL("/intent/post", originFor(SHARE_HOSTS.x));
  url.searchParams.set("text", text);
  url.searchParams.set("url", pageUrl);
  return url.toString();
}
