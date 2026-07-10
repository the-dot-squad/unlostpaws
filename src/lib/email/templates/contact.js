import { escapeHtml } from "../format";
import { wrapEmail } from "../layout";
import { calloutBox } from "../components";

export function buildContactFormEmail({
  name,
  topic,
  message,
  subject,
  heading,
  nameLabel,
  topicLabel,
  messageLabel,
}) {
  const safeName = escapeHtml(name);
  const safeTopic = escapeHtml(topic);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const contentHtml = `
    <p>A new support message has been submitted via the contact form:</p>
    ${calloutBox(`
      <p style="margin: 0 0 10px 0;"><strong>${escapeHtml(nameLabel)}:</strong> ${safeName}</p>
      <p style="margin: 0 0 10px 0;"><strong>${escapeHtml(topicLabel)}:</strong> ${safeTopic}</p>
      <p style="margin: 10px 0 0 0;"><strong>${escapeHtml(messageLabel)}:</strong></p>
      <p style="margin: 8px 0 0 0; padding: 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e5e7eb; color: #4b5563; font-style: italic;">
        ${safeMessage}
      </p>
    `)}
  `;

  return {
    subject,
    html: wrapEmail({
      subject,
      previewText: `New contact submission from ${name}: ${topic}`,
      heading: escapeHtml(heading),
      bodyHtml: contentHtml,
      locale: "en",
    }),
    text: `${nameLabel}: ${name}\n${topicLabel}: ${topic}\n\n${message}`,
  };
}
