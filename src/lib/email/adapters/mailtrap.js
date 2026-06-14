import { env } from "@/config/env";
import { requireBody } from "./utils.js";

const SANDBOX_API = "https://sandbox.api.mailtrap.io";

/**
 * Mailtrap Email Sandbox — dev-only; messages are captured in Mailtrap, not delivered.
 * @see https://docs.mailtrap.io/developers/email-sandbox/send-test-emails
 *
 * POST /api/send/{sandbox_id}
 * Auth: Api-Token header or Bearer token.
 * Body: same shape as transactional send (from, to, subject, html and/or text).
 */
export const mailtrapAdapter = {
  async send({ to, toName, subject, html, text }) {
    const { token, sandboxId } = env.email.mailtrap;
    const from = env.email.from;

    if (!token || !sandboxId) {
      console.log(
        "[mailtrap-sandbox] skipped — set MAILTRAP_TOKEN and MAILTRAP_SANDBOX_ID to capture emails",
        { to, subject }
      );
      return { success: true, skipped: true };
    }

    requireBody({ html, text });

    const res = await fetch(`${SANDBOX_API}/api/send/${sandboxId}`, {
      method: "POST",
      headers: {
        "Api-Token": token,
        "Content-Type": "application/json",
        "User-Agent": "UnLostPaws/1.0",
      },
      body: JSON.stringify({
        from: { email: from },
        to: [{ email: to, ...(toName && { name: toName }) }],
        subject,
        ...(html && { html }),
        ...(text && { text }),
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail = body.errors?.join("; ") || res.statusText || "unknown error";
      throw new Error(`Mailtrap sandbox send failed (${res.status}): ${detail}`);
    }

    if (body.success === false) {
      throw new Error(
        `Mailtrap sandbox send failed: ${body.errors?.join("; ") || "unknown error"}`
      );
    }

    return { success: true, messageIds: body.message_ids, sandboxId };
  },
};
