/** @file Vision webhook callback router by job type. */

import { NextResponse } from "next/server";
import { processListingCallback } from "@/lib/intelligence/callbacks/listing";
import { processOwnedPetCallback } from "@/lib/intelligence/callbacks/owned-pet";
import { processFailureCallback } from "@/lib/intelligence/callbacks/failure";

/**
 * Unified ML worker callback — routes by `jobType` in the JSON body.
 *
 * @param {Request} request
 */
export async function dispatchMlCallback(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const jobType = body.jobType || (body.ownedPetId ? "owned-pet" : body.listingId ? "listing" : null);

  // Failure payloads may omit jobType; body.error + entity id is enough.
  if (typeof body.error === "string" && !body.images?.length) {
    return processFailureCallback({ ...body, jobType: body.jobType || jobType });
  }

  if (jobType === "owned-pet") {
    return processOwnedPetCallback(body);
  }

  if (jobType === "search") {
    return NextResponse.json({ success: true, acknowledged: true });
  }

  if (!jobType || jobType === "listing") {
    return processListingCallback(body);
  }

  return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
}
