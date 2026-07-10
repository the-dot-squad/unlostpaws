import { appUrl, buildEmail, getTranslator, localizeReportReason } from "../compose";
import {
  calloutBox,
  moderationListingIntro,
  moderatorNoteHtml,
  noticeParagraph,
  salutation,
  warningStrikeLine,
} from "../components";
import { emailBold, escapeHtml } from "../format";

async function resolveModerationContext(options) {
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
    note,
    strikes,
    threshold,
    localizedReason: localizeReportReason(t, reason),
    name: salutation(t, ownerName),
  };
}

export async function buildModerationWarningEmail(options) {
  const ctx = await resolveModerationContext(options);
  const { t, locale, listingTitle, note, strikes, threshold, localizedReason, name } = ctx;

  const remaining = Math.max(0, threshold - strikes);
  const hasRemaining = remaining > 0;
  const hasNote = Boolean(note);

  const contentHtml = `
    <p>${name}</p>
    ${moderationListingIntro(t, "emails.moderationWarning.introLead", "emails.moderationWarning.introTrail", listingTitle)}
    ${calloutBox(`
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationWarning.violationReasonLabel")}</strong> <strong>${escapeHtml(localizedReason)}</strong></p>
      ${moderatorNoteHtml(t, "emails.moderationWarning.moderatorNoteLabel", note)}
    `)}
    <p>${warningStrikeLine(t, { strikes, threshold, hasRemaining, remaining })}</p>
    <p>${t("emails.moderationWarning.outro")}</p>
  `;

  return buildEmail({
    key: "moderationWarning",
    locale,
    bodyHtml: contentHtml,
    ctaUrl: appUrl(locale, "/terms"),
    previewValues: { listingTitle, reason: localizedReason },
    text: t("emails.moderationWarning.textFallback", {
      listingTitle,
      reason: localizedReason,
      strikes,
      threshold,
      hasNote,
      note,
    }),
  });
}

export async function buildModerationBanEmail(options) {
  const ctx = await resolveModerationContext(options);
  const { t, locale, listingTitle, note, strikes, threshold, localizedReason, name } = ctx;

  const contentHtml = `
    <p>${name}</p>
    ${noticeParagraph(t("emails.moderationBan.suspendedNotice"), { color: "#dc2626" })}
    <p>${t("emails.moderationBan.strikeExplanationLead")} ${emailBold(strikes)} ${t("emails.moderationBan.strikeExplanationTrail", { threshold })}</p>
    ${calloutBox(`
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationBan.latestViolationLabel")}</strong> "${escapeHtml(listingTitle)}"</p>
      <p style="margin: 0 0 10px 0;"><strong>${t("emails.moderationBan.reasonLabel")}</strong> ${escapeHtml(localizedReason)}</p>
      ${moderatorNoteHtml(t, "emails.moderationBan.moderatorNoteLabel", note)}
    `)}
    <p>${t("emails.moderationBan.outro")}</p>
  `;

  return buildEmail({
    key: "moderationBan",
    locale,
    bodyHtml: contentHtml,
    ctaUrl: appUrl(locale, "/contact"),
    previewValues: { strikes, listingTitle },
    text: t("emails.moderationBan.textFallback", {
      strikes,
      listingTitle,
      reason: localizedReason,
    }),
  });
}
