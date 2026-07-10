import { appUrl } from "./compose";
import { emailBold, escapeHtml } from "./format";

export function salutation(t, name) {
  return name
    ? t("emails.common.salutation", { name })
    : t("emails.common.salutationFallback");
}

export function calloutBox(innerHtml) {
  return `<div class="callout-box">${innerHtml}</div>`;
}

export function noticeParagraph(message, { color }) {
  return `<p style="color: ${color}; font-weight: 600;">${message}</p>`;
}

export function optionalReasonCallout(t, reasonLabelKey, reason) {
  if (!reason) return "";
  return calloutBox(
    `<p style="margin: 0;"><strong>${t(reasonLabelKey)}</strong> ${escapeHtml(reason)}</p>`
  );
}

export function moderationListingIntro(t, leadKey, trailKey, listingTitle) {
  return `<p>${t(leadKey)}${emailBold(listingTitle)}${t(trailKey)}</p>`;
}

export function matchListHtml({ matches, locale, t, showType = false, emptyKey }) {
  const matchLinks = matches
    .map((m) => {
      const typeSuffix = showType ? ` (${m.type})` : "";
      return `<li><a href="${appUrl(locale, `/listings/${m.id}`)}">${escapeHtml(m.title)}</a>${typeSuffix} — ${Math.round(m.score * 100)}% ${t("emails.common.matchPercentage")}</li>`;
    })
    .join("");

  return `<ul style="margin: 0; padding-left: 20px;">
    ${matchLinks || `<li>${t(emptyKey)}</li>`}
  </ul>`;
}

export function warningStrikeLine(t, { strikes, threshold, hasRemaining, remaining }) {
  let html = `${t("emails.moderationWarning.strikeLinePrefix")} ${emailBold(strikes)} ${t("emails.common.strikeOf")} ${emailBold(threshold)} ${t("emails.moderationWarning.strikeLineAccountSuffix")}`;
  if (hasRemaining) {
    html += ` ${t("emails.moderationWarning.strikeRemainingLead")}${emailBold(remaining)}${t("emails.moderationWarning.strikeRemainingTrail")}`;
  } else {
    html += ` ${t("emails.moderationWarning.strikeSuspended")}`;
  }
  return html;
}

export function moderatorNoteHtml(t, noteLabelKey, note) {
  if (!note) return "";
  return `<p style="margin: 10px 0 0 0; color: #4b5563;"><strong>${t(noteLabelKey)}</strong> ${escapeHtml(note)}</p>`;
}
