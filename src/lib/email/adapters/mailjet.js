import { env } from "@/config/env";
import { requireBody } from "./utils.js";

const SEND_URL = "https://api.mailjet.com/v3.1/send";

/**
 * Mailjet Send API v3.1 (detailed per-message feedback).
 * @see https://dev.mailjet.com/email/reference/send-emails/
 *
 * Auth: HTTP Basic (apiKey:apiSecret).
 * Body: { Messages: [{ From, To, Subject, HTMLPart, TextPart }] }.
 * Success: HTTP 201, Messages[].Status === "success".
 */
export const mailjetAdapter = {
  async send({ to, toName, subject, html, text }) {
    const { apiKey, apiSecret } = env.email.mailjet;
    const from = env.email.from;
    if (!apiKey || !apiSecret) {
      throw new Error("Mailjet not configured (MAILJET_API_KEY / MAILJET_API_SECRET)");
    }

    requireBody({ html, text });

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const message = {
      From: { Email: from },
      To: [{ Email: to, ...(toName && { Name: toName }) }],
      Subject: subject,
      ...(html && { HTMLPart: html }),
      ...(text && { TextPart: text }),
    };

    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Messages: [message] }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errors = (body.Messages ?? []).flatMap((m) => m.Errors ?? []);
      const detail =
        errors.map((e) => e.ErrorMessage).filter(Boolean).join("; ") || res.statusText;
      throw new Error(`Mailjet send failed (${res.status}): ${detail}`);
    }

    const result = body.Messages?.[0];
    if (result?.Status === "error") {
      const errors = (result.Errors ?? []).map((e) => e.ErrorMessage).join("; ");
      throw new Error(`Mailjet send failed: ${errors || "unknown error"}`);
    }

    const messageIds = (result?.To ?? []).map((r) => String(r.MessageID)).filter(Boolean);
    return { success: true, messageIds };
  },
};
