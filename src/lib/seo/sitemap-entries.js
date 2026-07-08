/** @file Sitemap data — active listings for search engine discovery. */

import { connectDB } from "@/config/db";
import { listingPublicId, Listing } from "@/models/listing";

const MAX_LISTINGS = 10_000;

/**
 * Active listings for sitemap generation.
 * @returns {Promise<Array<{ publicId: string, updatedAt: Date }>>}
 */
export async function listActiveListingSitemapEntries() {
  await connectDB();

  const rows = await Listing.find({ status: "active" })
    .select("_id updatedAt")
    .sort({ updatedAt: -1 })
    .limit(MAX_LISTINGS)
    .lean();

  return rows.map((row) => ({
    publicId: listingPublicId(row),
    updatedAt: row.updatedAt,
  }));
}
