/**
 * Shared helpers for email provider adapters.
 */

/** At least one body format is required by all providers. */
export function requireBody({ html, text }) {
  if (!html && !text) {
    throw new Error("Email must include html or text body");
  }
}

/** Build a useful error from a failed HTTP response. */
export async function httpSendError(res, provider) {
  let detail = res.statusText || "Unknown error";
  try {
    const body = await res.json();
    if (Array.isArray(body.errors)) {
      detail = body.errors.join("; ");
    } else if (body.error?.message) {
      detail = body.error.message;
    } else if (body.Messages) {
      const errors = body.Messages.flatMap((m) => m.Errors ?? [])
        .map((e) => e.ErrorMessage)
        .filter(Boolean);
      if (errors.length) detail = errors.join("; ");
    }
  } catch {
    // Response body was not JSON — keep statusText.
  }
  throw new Error(`${provider} send failed (${res.status}): ${detail}`);
}
