import { env } from "@/config/env";
import { wrapEmail } from "./layout";
import { createTranslator } from "next-intl";
import enMessages from "@messages/en.json";
import faMessages from "@messages/fa.json";

const baseUrl = env.app.url;
const MESSAGES_BY_LOCALE = { en: enMessages, fa: faMessages };

function localizeReportReason(t, reason) {
  const knownReasons = ["spam", "fake", "inappropriate", "duplicate", "other"];
  return knownReasons.includes(reason) ? t(`reportReasons.${reason}`) : reason;
}

function moderationSalutation(t, ownerName) {
  return ownerName
    ? t("emails.common.salutation", { name: ownerName })
    : t("emails.common.salutationFallback");
}

async function resolveUserModerationEmailContext(options) {
  const {
    ownerName,
    listingTitle,
    reason,
    note,
    strikes,
    threshold,
    locale = "en",
  } = options;
  const t = await getTranslator(locale);

  return {
    t,
    locale,
    listingTitle,
    reason,
    note,
    strikes,
    threshold,
    localizedReason: localizeReportReason(t, reason),
    name: moderationSalutation(t, ownerName),
  };
}

export async function getTranslator(locale = "en") {
  const normalizedLocale = ["en", "fa"].includes(locale) ? locale : "en";
  const messages = MESSAGES_BY_LOCALE[normalizedLocale] ?? enMessages;
  return createTranslator({ locale: normalizedLocale, messages });
}

export async function matchNotificationEmail({ ownerName, missingTitle, matches, locale = "en" }) {
  const t = await getTranslator(locale);

  const matchLinks = matches
    .map(
      (m) =>
        `<li><a href="${baseUrl}/${locale}/listings/${m.id}">${m.title}</a> — ${Math.round(m.score * 100)}% ${t("emails.common.matchPercentage")}</li>`
    )
    .join("");

  const name = ownerName ? t("emails.common.salutation", { name: ownerName }) : t("emails.common.salutationFallback");

  const contentHtml = `
    <p>${name}</p>
    <p>${t("emails.matchNotification.intro", { missingTitle })}</p>
    <div class="callout-box">
      <ul style="margin: 0; padding-left: 20px;">
        ${matchLinks || `<li>${t("emails.matchNotification.noMatches")}</li>`}
      </ul>
    </div>
    <p>${t("emails.matchNotification.outro")}</p>
  `;

  return {
    subject: t("emails.matchNotification.subject"),
    html: wrapEmail({
      subject: t("emails.matchNotification.subject"),
      previewText: t("emails.matchNotification.previewText", { missingTitle }),
      heading: t("emails.matchNotification.heading"),
      bodyHtml: contentHtml,
      ctaUrl: `${baseUrl}/${locale}/account/matches`,
      ctaLabel: t("emails.matchNotification.ctaLabel"),
      locale,
    }),
    text: t("emails.matchNotification.textFallback", {
      missingTitle,
      url: `${baseUrl}/${locale}/account/matches`,
    }),
  };
}

export async function corroborationMatchEmail({ ownerName, matches, locale = "en" }) {
  const t = await getTranslator(locale);

  const matchLinks = matches
    .map(
      (m) =>
        `<li><a href="${baseUrl}/${locale}/listings/${m.id}">${m.title}</a> (${m.type}) — ${Math.round(m.score * 100)}% ${t("emails.common.matchPercentage")}</li>`
    )
    .join("");

  const name = ownerName ? t("emails.common.salutation", { name: ownerName }) : t("emails.common.salutationFallback");

  const contentHtml = `
    <p>${name}</p>
    <p>${t("emails.corroborationMatch.intro")}</p>
    <div class="callout-box">
      <ul style="margin: 0; padding-left: 20px;">
        ${matchLinks || `<li>${t("emails.corroborationMatch.noMatches")}</li>`}
      </ul>
    </div>
    <p>${t("emails.corroborationMatch.outro")}</p>
  `;

  return {
    subject: t("emails.corroborationMatch.subject"),
    html: wrapEmail({
      subject: t("emails.corroborationMatch.subject"),
      previewText: t("emails.corroborationMatch.previewText"),
      heading: t("emails.corroborationMatch.heading"),
      bodyHtml: contentHtml,
      ctaUrl: `${baseUrl}/${locale}/account/matches`,
      ctaLabel: t("emails.corroborationMatch.ctaLabel"),
      locale,
    }),
    text: t("emails.corroborationMatch.textFallback", {
      url: `${baseUrl}/${locale}/account/matches`,
    }),
  };
}

export async function moderationOutcomeEmail(options) {
  const {
    ownerName,
    listingTitle,
    action,
    note,
    strikes,
    threshold,
    locale = "en",
  } = options;
  const t = await getTranslator(locale);

  const actionLower = action.toLowerCase();
  const localizedAction = actionLower === "approved"
    ? t("emails.moderationOutcome.actionApproved")
    : (actionLower === "rejected" ? t("emails.moderationOutcome.actionRejected") : action);

  const isSuspended = strikes >= threshold;
  const actionColor = actionLower === "approved" ? "#16a34a" : "#dc2626";

  let strikeLine = "";
  if (strikes && threshold) {
    strikeLine = `<p style="margin-top: 16px;">${t("emails.moderationOutcome.strikeLine", {
      strikes,
      threshold,
      isSuspended,
    })}</p>`;
  }

  const name = ownerName ? t("emails.common.salutation", { name: ownerName }) : t("emails.common.salutationFallback");

  const contentHtml = `
    <p>${name}</p>
    <p>${t("emails.moderationOutcome.intro", { listingTitle })}</p>
    <div class="callout-box">
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationOutcome.decisionLabel")}</strong> <span style="color: ${actionColor}; font-weight: 600;">${localizedAction}</span></p>
      ${note ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #4b5563;">"${note}"</p>` : ""}
      ${strikeLine}
    </div>
    <p>${t("emails.moderationOutcome.outro")}</p>
  `;

  const hasStrikes = Boolean(strikes && threshold);

  return {
    subject: t("emails.moderationOutcome.subject"),
    html: wrapEmail({
      subject: t("emails.moderationOutcome.subject"),
      previewText: t("emails.moderationOutcome.previewText", {
        listingTitle,
        action: localizedAction,
      }),
      heading: t("emails.moderationOutcome.heading"),
      bodyHtml: contentHtml,
      ctaUrl: `${baseUrl}/${locale}/account/profile`,
      ctaLabel: t("emails.moderationOutcome.ctaLabel"),
      locale,
    }),
    text: t("emails.moderationOutcome.textFallback", {
      listingTitle,
      action: localizedAction,
      hasStrikes,
      strikes,
      threshold,
    }),
  };
}

export async function userModerationWarningEmail(options) {
  const ctx = await resolveUserModerationEmailContext(options);
  const { t, locale, listingTitle, note, strikes, threshold, localizedReason, name } = ctx;

  const remaining = Math.max(0, threshold - strikes);
  const hasRemaining = remaining > 0;

  const contentHtml = `
    <p>${name}</p>
    <p>${t("emails.moderationWarning.intro", { listingTitle })}</p>
    <div class="callout-box">
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationWarning.violationReasonLabel")}</strong> <strong>${localizedReason}</strong></p>
      ${note ? `<p style="margin: 10px 0 0 0; color: #4b5563;"><strong>${t("emails.moderationWarning.moderatorNoteLabel")}</strong> ${note}</p>` : ""}
    </div>
    <p>${t("emails.moderationWarning.strikeLine", {
      strikes,
      threshold,
      hasRemaining,
      remaining,
    })}</p>
    <p>${t("emails.moderationWarning.outro")}</p>
  `;

  const hasNote = Boolean(note);

  return {
    subject: t("emails.moderationWarning.subject"),
    html: wrapEmail({
      subject: t("emails.moderationWarning.subject"),
      previewText: t("emails.moderationWarning.previewText", {
        listingTitle,
        reason: localizedReason,
      }),
      heading: t("emails.moderationWarning.heading"),
      bodyHtml: contentHtml,
      ctaUrl: `${baseUrl}/${locale}/terms`,
      ctaLabel: t("emails.moderationWarning.ctaLabel"),
      locale,
    }),
    text: t("emails.moderationWarning.textFallback", {
      listingTitle,
      reason: localizedReason,
      strikes,
      threshold,
      hasNote,
      note,
    }),
  };
}

export async function userModerationBanEmail(options) {
  const ctx = await resolveUserModerationEmailContext(options);
  const { t, locale, listingTitle, note, strikes, threshold, localizedReason, name } = ctx;

  const contentHtml = `
    <p>${name}</p>
    <p style="color: #dc2626; font-weight: 600;">${t("emails.moderationBan.suspendedNotice")}</p>
    <p>${t("emails.moderationBan.strikeExplanation", { strikes, threshold })}</p>
    <div class="callout-box">
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationBan.latestViolationLabel")}</strong> "${listingTitle}"</p>
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationBan.reasonLabel")}</strong> ${localizedReason}</p>
      ${note ? `<p style="margin: 10px 0 0 0; color: #4b5563;"><strong>${t("emails.moderationBan.moderatorNoteLabel")}</strong> ${note}</p>` : ""}
    </div>
    <p>${t("emails.moderationBan.outro")}</p>
  `;

  return {
    subject: t("emails.moderationBan.subject"),
    html: wrapEmail({
      subject: t("emails.moderationBan.subject"),
      previewText: t("emails.moderationBan.previewText", {
        strikes,
        listingTitle,
      }),
      heading: t("emails.moderationBan.heading"),
      bodyHtml: contentHtml,
      ctaUrl: `${baseUrl}/${locale}/contact`,
      ctaLabel: t("emails.moderationBan.ctaLabel"),
      locale,
    }),
    text: t("emails.moderationBan.textFallback", {
      strikes,
      listingTitle,
      reason: localizedReason,
    }),
  };
}

export async function reportReceivedEmail({ reporterName, locale = "en" }) {
  const t = await getTranslator(locale);

  const name = reporterName ? t("emails.common.salutation", { name: reporterName }) : t("emails.common.salutationFallback");

  const contentHtml = `
    <p>${name}</p>
    <p>${t("emails.reportReceived.intro")}</p>
    <p>${t("emails.reportReceived.outro")}</p>
  `;

  return {
    subject: t("emails.reportReceived.subject"),
    html: wrapEmail({
      subject: t("emails.reportReceived.subject"),
      previewText: t("emails.reportReceived.previewText"),
      heading: t("emails.reportReceived.heading"),
      bodyHtml: contentHtml,
      locale,
    }),
    text: t("emails.reportReceived.textFallback"),
  };
}

export function contactFormEmail({
  name,
  topic,
  message,
  subject,
  heading,
  nameLabel,
  topicLabel,
  messageLabel,
}) {
  const escape = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const safeName = escape(name);
  const safeTopic = escape(topic);
  const safeMessage = escape(message).replace(/\n/g, "<br>");

  const contentHtml = `
    <p>A new support message has been submitted via the contact form:</p>
    <div class="callout-box">
      <p style="margin: 0 0 10px 0;"><strong>${escape(nameLabel)}:</strong> ${safeName}</p>
      <p style="margin: 0 0 10px 0;"><strong>${escape(topicLabel)}:</strong> ${safeTopic}</p>
      <p style="margin: 10px 0 0 0;"><strong>${escape(messageLabel)}:</strong></p>
      <p style="margin: 8px 0 0 0; padding: 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e5e7eb; color: #4b5563; font-style: italic;">
        ${safeMessage}
      </p>
    </div>
  `;

  return {
    subject,
    html: wrapEmail({
      subject,
      previewText: `New contact submission from ${name}: ${topic}`,
      heading: escape(heading),
      bodyHtml: contentHtml,
      locale: "en",
    }),
    text: `${nameLabel}: ${name}\n${topicLabel}: ${topic}\n\n${message}`,
  };
}
