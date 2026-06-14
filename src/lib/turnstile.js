/** @file Server-side Cloudflare Turnstile verification helpers. */

import { headers } from "next/headers";
import { verifyTurnstile, TurnstileError } from "nextjs-turnstile";
import { env } from "@/config/env";

/**
 * Extract a Turnstile token from an API request.
 * Accepts the standard Cloudflare header or a JSON body field.
 *
 * @param {Request} request
 * @param {{ token?: string }} [body] Pre-parsed JSON body (optional).
 * @returns {string | null}
 */
export function getTurnstileToken(request, body) {
  const fromHeader = request.headers.get("cf-turnstile-response");
  if (fromHeader?.trim()) return fromHeader.trim();

  const fromBody = body?.token;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();

  return null;
}

/**
 * Verify a Turnstile token for a protected listing endpoint.
 *
 * @param {string | null | undefined} token
 * @param {string} action Expected action from `@/config/constants/turnstile`.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function verifyListingTurnstile(token, action) {
  if (!token) {
    return { ok: false, error: "captcha_required" };
  }

  if (!env.turnstile.secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return { ok: false, error: "captcha_unavailable" };
  }

  try {
    await verifyTurnstile(token, {
      secretKey: env.turnstile.secretKey,
      headers: await headers(),
      action,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof TurnstileError) {
      console.warn("Turnstile verification failed:", error.errorCodes);
      return { ok: false, error: "captcha_failed" };
    }

    console.error("Turnstile verification error:", error);
    return { ok: false, error: "captcha_failed" };
  }
}
