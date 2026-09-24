/** @file Vision worker failure callback — mark listing/pet processing failed. */

import { NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { OwnedPet } from "@/models/owned-pet";

/**
 * @param {object} body
 */
export async function processFailureCallback(body) {
  const { listingId, ownedPetId, error = "Processing failed" } = body;

  // Prefer explicit jobType; otherwise infer from entity ids so pending entities clear.
  let jobType = body.jobType;
  if (!jobType) {
    if (ownedPetId) jobType = "owned-pet";
    else if (listingId) jobType = "listing";
  }

  if (jobType === "search") {
    return NextResponse.json({ success: true, acknowledged: true });
  }

  if (!jobType) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await connectDB();

  if (jobType === "listing" && listingId) {
    await Listing.findByIdAndUpdate(listingId, {
      processingStatus: "failed",
      processingError: error,
    });
  } else if (jobType === "owned-pet" && ownedPetId) {
    await OwnedPet.findByIdAndUpdate(ownedPetId, {
      processingStatus: "failed",
      processingError: error,
    });
  } else {
    return NextResponse.json({ error: "Missing entity id for job type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
