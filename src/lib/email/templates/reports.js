import { buildEmail, getTranslator } from "../compose";
import { salutation } from "../components";

export async function buildReportReceivedEmail({ reporterName, locale = "en" }) {
  const t = await getTranslator(locale);

  const contentHtml = `
    <p>${salutation(t, reporterName)}</p>
    <p>${t("emails.reportReceived.intro")}</p>
    <p>${t("emails.reportReceived.outro")}</p>
  `;

  return buildEmail({
    key: "reportReceived",
    locale,
    bodyHtml: contentHtml,
    text: t("emails.reportReceived.textFallback"),
  });
}
