import { env } from "@/config/env";

const baseUrl = env.app.url;

export function matchNotificationEmail({ ownerName, missingTitle, matches, locale = "en" }) {
  const matchLinks = matches
    .map(
      (m) =>
        `<li><a href="${baseUrl}/${locale}/listings/${m.id}">${m.title}</a> — ${Math.round(m.score * 100)}% match</li>`
    )
    .join("");

  return {
    subject: "Possible match for your missing pet — UnLostPaws",
    html: `
      <h2>Hi ${ownerName || "there"},</h2>
      <p>We found possible matches for your missing pet alert: <strong>${missingTitle}</strong></p>
      <ul>${matchLinks}</ul>
      <p>Please review these alerts — they may help reunite you with your pet.</p>
      <p><a href="${baseUrl}/${locale}/account/matches">View all matches</a></p>
    `,
    text: `Possible matches found for ${missingTitle}. Visit ${baseUrl}/${locale}/account/matches`,
  };
}

export function moderationOutcomeEmail({ ownerName, listingTitle, action, note, strikes, threshold }) {
  const strikeLine =
    strikes && threshold
      ? `<p>This records strike <strong>${strikes}</strong> of <strong>${threshold}</strong> on your account.</p>`
      : "";

  return {
    subject: `Update on your pet alert — UnLostPaws`,
    html: `
      <h2>Hi ${ownerName || "there"},</h2>
      <p>Your alert "<strong>${listingTitle}</strong>" has been reviewed.</p>
      <p><strong>Action:</strong> ${action}</p>
      ${note ? `<p>${note}</p>` : ""}
      ${strikeLine}
    `,
    text: `Your alert "${listingTitle}" — Action: ${action}${strikes ? ` (strike ${strikes}/${threshold})` : ""}`,
  };
}

/** Warning after a confirmed moderation violation (strike recorded). */
export function userModerationWarningEmail({
  ownerName,
  listingTitle,
  reason,
  note,
  strikes,
  threshold,
}) {
  const remaining = Math.max(0, threshold - strikes);
  return {
    subject: "Community guidelines warning — UnLostPaws",
    html: `
      <h2>Hi ${ownerName || "there"},</h2>
      <p>We reviewed reports about your listing "<strong>${listingTitle}</strong>" and found a violation.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${note ? `<p><strong>Moderator note:</strong> ${note}</p>` : ""}
      <p>This is strike <strong>${strikes}</strong> of <strong>${threshold}</strong> on your account.
      ${remaining > 0 ? `Further confirmed violations may result in suspension (${remaining} remaining before suspension).` : ""}</p>
      <p>Please review our community guidelines and ensure future listings comply.</p>
    `,
    text: `Warning: violation (${reason}) on "${listingTitle}". Strike ${strikes}/${threshold}.${note ? ` Note: ${note}` : ""}`,
  };
}

/** Sent when confirmed violations reach the suspension threshold. */
export function userModerationBanEmail({ ownerName, listingTitle, reason, note, strikes, threshold }) {
  return {
    subject: "Account suspended — UnLostPaws",
    html: `
      <h2>Hi ${ownerName || "there"},</h2>
      <p>Your account has been suspended after <strong>${strikes}</strong> confirmed community guideline violations
      (limit: ${threshold}).</p>
      <p>The most recent case involved "<strong>${listingTitle}</strong>" (${reason}).</p>
      ${note ? `<p><strong>Moderator note:</strong> ${note}</p>` : ""}
      <p>If you believe this is a mistake, please contact support.</p>
    `,
    text: `Account suspended after ${strikes} violations. Latest: "${listingTitle}" (${reason}).`,
  };
}

export function corroborationMatchEmail({ ownerName, matches, locale = "en" }) {
  const matchLinks = matches
    .map(
      (m) =>
        `<li><a href="${baseUrl}/${locale}/listings/${m.id}">${m.title}</a> (${m.type}) — ${Math.round(m.score * 100)}% match</li>`
    )
    .join("");

  return {
    subject: "Possible related pet sighting — UnLostPaws",
    html: `
      <h2>Hi ${ownerName || "there"},</h2>
      <p>We found alerts that may show the same animal as yours:</p>
      <ul>${matchLinks}</ul>
      <p><a href="${baseUrl}/${locale}/account/matches">Review matches</a></p>
    `,
    text: `Related pet sightings found. Visit ${baseUrl}/${locale}/account/matches`,
  };
}

export function reportReceivedEmail({ reporterName }) {
  return {
    subject: "Report received — UnLostPaws",
    html: `<p>Hi ${reporterName || "there"}, thank you for your report. Our team will review it shortly.</p>`,
    text: "Thank you for your report.",
  };
}

/**
 * Inbound contact form message delivered to the support inbox.
 */
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

  return {
    subject,
    html: `
      <h2>${escape(heading)}</h2>
      <p><strong>${escape(nameLabel)}:</strong> ${safeName}</p>
      <p><strong>${escape(topicLabel)}:</strong> ${safeTopic}</p>
      <p><strong>${escape(messageLabel)}:</strong></p>
      <p>${safeMessage}</p>
    `,
    text: `${nameLabel}: ${name}\n${topicLabel}: ${topic}\n\n${message}`,
  };
}
