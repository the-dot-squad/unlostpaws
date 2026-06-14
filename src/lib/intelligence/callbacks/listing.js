import { NextResponse } from "next/server";
import { ingestProcessedListing } from "@/lib/intelligence/ingest/listing";

/**
 * @param {object} body
 */
export async function processListingCallback(body) {
  const { listingId, images, errors = [], embeddingModel } = body;

  if (!listingId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await ingestProcessedListing({
    listingId,
    images,
    errors,
    embeddingModel,
  });

  if (result.status === 404) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (result.status === 400) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
