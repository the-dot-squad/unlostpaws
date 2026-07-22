/** @file Cron reprocess — re-run cross-type matching for stale active listings. */

import { connectDB } from "@/config/db";
import { Listing } from "@/models/listing";
import { getListingImageVectors } from "@/lib/qdrant/listing-images";
import { findListingMatches } from "@/lib/intelligence/matching/cross-type";
import { notifyListingMatches } from "@/lib/intelligence/matching/notify";
import { env } from "@/config/env";

const SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Re-run cross-type matching for active listings not scanned recently. */
export async function reprocessListingMatches({ limit = env.cron.matchReprocessLimit } = {}) {
  await connectDB();

  const cutoff = new Date(Date.now() - SCAN_INTERVAL_MS);

  const listings = await Listing.find({
    status: "active",
    processingStatus: "ready",
    $or: [{ lastMatchScanAt: { $exists: false } }, { lastMatchScanAt: { $lt: cutoff } }],
  })
    .sort({ lastMatchScanAt: 1, createdAt: 1 })
    .limit(limit)
    .lean();

  let matchesCreated = 0;

  for (const listing of listings) {
    const queryImages = await getListingImageVectors(listing._id);
    const embeddings = queryImages.map((img) => img.embedding).filter((e) => e?.length);

    if (embeddings.length) {
      const result = await findListingMatches({
        listingId: listing._id,
        listingType: listing.type,
        petType: listing.petType,
        embeddings,
        queryImages,
        userId: listing.userId,
        embeddingModel: listing.embeddingModel,
      });

      matchesCreated += result.created;

      if (result.created > 0) {
        await notifyListingMatches({ listingId: listing._id });
      }
    }

    await Listing.findByIdAndUpdate(listing._id, { lastMatchScanAt: new Date() });
  }

  return { scanned: listings.length, matchesCreated };
}
