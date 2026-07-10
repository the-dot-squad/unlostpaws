import { appUrl, buildEmail, getTranslator } from "../compose";
import {
  noticeParagraph,
  optionalReasonCallout,
  salutation,
} from "../components";

/**
 * Email sent when an administrator manually suspends an account.
 */
export async function buildManualBanEmail({ ownerName, locale = "en", reason }) {
  const t = await getTranslator(locale);
  const trimmedReason = reason?.trim() || undefined;

  const contentHtml = `
    <p>${salutation(t, ownerName)}</p>
    ${noticeParagraph(t("emails.manualBan.suspendedNotice"), { color: "#dc2626" })}
    ${optionalReasonCallout(t, "emails.manualBan.reasonLabel", trimmedReason)}
    <p>${t("emails.manualBan.outro")}</p>
  `;

  return buildEmail({
    key: "manualBan",
    locale,
    bodyHtml: contentHtml,
    ctaUrl: appUrl(locale, "/contact"),
    text: trimmedReason
      ? `${t("emails.manualBan.textFallback")} ${t("emails.manualBan.reasonLabel")} ${trimmedReason}`
      : t("emails.manualBan.textFallback"),
  });
}

/**
 * Email sent when an administrator lifts a manual account suspension.
 */
export async function buildManualUnbanEmail({ ownerName, locale = "en" }) {
  const t = await getTranslator(locale);

  const contentHtml = `
    <p>${salutation(t, ownerName)}</p>
    ${noticeParagraph(t("emails.manualUnban.restoredNotice"), { color: "#16a34a" })}
    <p>${t("emails.manualUnban.outro")}</p>
  `;

  return buildEmail({
    key: "manualUnban",
    locale,
    bodyHtml: contentHtml,
    ctaUrl: appUrl(locale, "/sign-in"),
    text: t("emails.manualUnban.textFallback"),
  });
}
