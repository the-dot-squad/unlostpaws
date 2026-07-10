import { env } from "@/config/env";
import { requireBody } from "./utils.js";

/**
 * ZeptoMail transactional email API.
 * @see https://www.zoho.com/zeptomail/help/api/email-sending.html
 *
 * Auth: Authorization: Zoho-enczapikey <send_mail_token>
 * Body: from { address, name? }, to [{ email_address: { address, name? } }],
 *       subject, htmlbody and/or textbody.
 */
export const zeptomailAdapter = {
  async send({ to, toName, subject, html, text }) {
    const token = env.email.zeptomail.token;
    if (!token) {
      throw new Error("Zeptomail not configured (ZEPTOMAIL_TOKEN)");
    }

    requireBody({ html, text });

    // Env holds the raw token; API expects the full header value.
    const authorization = token.startsWith("Zoho-enczapikey")
      ? token
      : `Zoho-enczapikey ${token}`;

    const payload = {
      from: { address: env.email.from },
      to: [{ email_address: { address: to, ...(toName && { name: toName }) } }],
      subject,
      ...(html && { htmlbody: html }),
      ...(text && { textbody: text }),
    };

    const res = await fetch(env.email.zeptomail.apiOrigin, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        body.error?.message ||
        body.error?.details?.[0]?.message ||
        res.statusText ||
        "unknown error";
      throw new Error(`Zeptomail send failed (${res.status}): ${detail}`);
    }

    return { success: true, requestId: body.request_id };
  },
};
