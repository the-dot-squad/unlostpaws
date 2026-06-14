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

  const jobType = body.jobType || (body.ownedPetId ? "owned-pet" : "listing");

  if (typeof body.error === "string" && !body.images?.length) {
    return processFailureCallback(body);
  }

  if (jobType === "owned-pet") {
    return processOwnedPetCallback(body);
  }

  if (jobType === "search") {
    return NextResponse.json({ success: true, acknowledged: true });
  }

  return processListingCallback(body);
}
