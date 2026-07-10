import { appUrl, buildEmail, getTranslator } from "../compose";
import {
  calloutBox,
  matchListHtml,
  salutation,
} from "../components";
import { emailBold } from "../format";

export async function buildMatchNotificationEmail({
  ownerName,
  missingTitle,
  matches,
  locale = "en",
}) {
  const t = await getTranslator(locale);

  const contentHtml = `
    <p>${salutation(t, ownerName)}</p>
    <p>${t("emails.matchNotification.introLead")} ${emailBold(missingTitle)}</p>
    ${calloutBox(matchListHtml({
      matches,
      locale,
      t,
      emptyKey: "emails.matchNotification.noMatches",
    }))}
    <p>${t("emails.matchNotification.outro")}</p>
  `;

  return buildEmail({
    key: "matchNotification",
    locale,
    bodyHtml: contentHtml,
    ctaUrl: appUrl(locale, "/account/matches"),
    previewValues: { missingTitle },
    text: t("emails.matchNotification.textFallback", {
      missingTitle,
      url: appUrl(locale, "/account/matches"),
    }),
  });
}

export async function buildCorroborationMatchEmail({
  ownerName,
  matches,
  locale = "en",
}) {
  const t = await getTranslator(locale);

  const contentHtml = `
    <p>${salutation(t, ownerName)}</p>
    <p>${t("emails.corroborationMatch.intro")}</p>
    ${calloutBox(matchListHtml({
      matches,
      locale,
      t,
      showType: true,
      emptyKey: "emails.corroborationMatch.noMatches",
    }))}
    <p>${t("emails.corroborationMatch.outro")}</p>
  `;

  return buildEmail({
    key: "corroborationMatch",
    locale,
    bodyHtml: contentHtml,
    ctaUrl: appUrl(locale, "/account/matches"),
    text: t("emails.corroborationMatch.textFallback", {
      url: appUrl(locale, "/account/matches"),
    }),
  });
}
