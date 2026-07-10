import { env } from "@/config/env";
import { createTranslator } from "next-intl";
import enMessages from "@messages/en.json";
import faMessages from "@messages/fa.json";
import { wrapEmail } from "./layout";

const baseUrl = env.app.url;
const MESSAGES_BY_LOCALE = { en: enMessages, fa: faMessages };

export async function getTranslator(locale = "en") {
  const normalizedLocale = ["en", "fa"].includes(locale) ? locale : "en";
  const messages = MESSAGES_BY_LOCALE[normalizedLocale] ?? enMessages;
  return createTranslator({ locale: normalizedLocale, messages });
}

export function localizeReportReason(t, reason) {
  const knownReasons = ["spam", "fake", "inappropriate", "duplicate", "other"];
  return knownReasons.includes(reason) ? t(`reportReasons.${reason}`) : reason;
}

export function appUrl(locale, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}/${locale}${normalizedPath}`;
}

/**
 * Build the standard `{ subject, html, text }` payload used by i18n transactional emails.
 *
 * @param {object} params
 * @param {string} params.key - Message key under `emails.*` (e.g. `"manualBan"`)
 * @param {string} [params.locale]
 * @param {string} params.bodyHtml
 * @param {string} [params.ctaUrl]
 * @param {string} params.text - Plain-text fallback body
 * @param {Record<string, unknown>} [params.previewValues] - Interpolation values for `previewText`
 */
export async function buildEmail({ key, locale = "en", bodyHtml, ctaUrl, text, previewValues }) {
  const t = await getTranslator(locale);
  const prefix = `emails.${key}`;
  const subject = t(`${prefix}.subject`);

  return {
    subject,
    html: wrapEmail({
      subject,
      previewText: previewValues
        ? t(`${prefix}.previewText`, previewValues)
        : t(`${prefix}.previewText`),
      heading: t(`${prefix}.heading`),
      bodyHtml,
      ctaUrl,
      ctaLabel: ctaUrl ? t(`${prefix}.ctaLabel`) : undefined,
      locale,
    }),
    text,
  };
}
