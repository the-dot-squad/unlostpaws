/** @file Shared GET route query validation helpers. */

import { NextResponse } from "next/server";
import { validate } from "@/lib/validation";

/**
 * Validate query input and return parsed data or an error response.
 * @param {object} input
 * @param {import("zod").ZodTypeAny} schema
 * @param {{ error?: string; status?: number; includeField?: boolean }} [options]
 */
export function parseValidatedQuery(input, schema, { error = "Invalid request", status = 400, includeField = false } = {}) {
  const parsed = validate(schema, input);
  if (!parsed.ok) {
    const body = includeField ? { error: parsed.error, field: parsed.field } : { error };
    return { response: NextResponse.json(body, { status }) };
  }
  return { data: parsed.data };
}
