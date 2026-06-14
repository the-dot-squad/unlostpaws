import { NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { OwnedPet } from "@/models/owned-pet";

/**
 * @param {object} body
 */
export async function processFailureCallback(body) {
  const { jobType, listingId, ownedPetId, error = "Processing failed" } = body;

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
  } else if (jobType === "search") {
    return NextResponse.json({ success: true, acknowledged: true });
  } else {
    return NextResponse.json({ error: "Missing entity id for job type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
