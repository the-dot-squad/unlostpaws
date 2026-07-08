import { dispatchMlCallback } from "@/lib/intelligence/callbacks/dispatch";
import { env } from "@/config/env";
import { rejectInvalidInternalSecret } from "@/lib/request-metadata";

export const maxDuration = 60;

/**
 * Vision worker callback — authenticate via `?token=`, `Authorization: Bearer`, or `x-api-key`.
 */
export async function POST(request) {
  const unauthorized = rejectInvalidInternalSecret(request, env.webhook.secret);
  if (unauthorized) return unauthorized;

  return dispatchMlCallback(request);
}
