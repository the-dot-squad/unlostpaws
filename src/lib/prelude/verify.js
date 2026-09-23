/** @file Prelude phone verification — create (SMS/RCS) and check OTP. */

import "server-only";
import { getPrelude, isPreludeConfigured } from "@/lib/prelude/client";

/**
 * Send (or retry) a verification code to an E.164 phone via SMS/RCS only.
 *
 * @param {{ phone: string, correlationId?: string }} params
 * @returns {Promise<{ ok: true, id: string } | { error: string }>}
 */
export async function sendPhoneCode({ phone, correlationId }) {
  if (!isPreludeConfigured()) return { error: "verify_unavailable" };

  try {
    const client = getPrelude();
    /** @type {Record<string, unknown>} */
    const body = {
      target: {
        type: "phone_number",
        value: phone,
      },
      options: {
        channels: ["sms", "rcs"],
      },
    };
    if (correlationId) {
      body.metadata = { correlation_id: String(correlationId).slice(0, 80) };
    }

    const verification = await client.verification.create(body);
    return { ok: true, id: verification.id };
  } catch (err) {
    console.error("[prelude] sendPhoneCode failed", err);
    return { error: "verify_send_failed" };
  }
}

/**
 * Check an OTP code for an E.164 phone.
 *
 * @param {{ phone: string, code: string }} params
 * @returns {Promise<{ ok: true, status: string } | { error: string, status?: string }>}
 */
export async function checkPhoneCode({ phone, code }) {
  if (!isPreludeConfigured()) return { error: "verify_unavailable" };

  try {
    const client = getPrelude();
    const check = await client.verification.check({
      target: {
        type: "phone_number",
        value: phone,
      },
      code: String(code).trim(),
    });

    if (check.status === "success") {
      return { ok: true, status: check.status };
    }

    if (check.status === "expired_or_not_found") {
      return { error: "otp_expired", status: check.status };
    }

    return { error: "otp_invalid", status: check.status };
  } catch (err) {
    console.error("[prelude] checkPhoneCode failed", err);
    return { error: "verify_check_failed" };
  }
}
