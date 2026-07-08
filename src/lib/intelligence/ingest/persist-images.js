import { ListingImage } from "@/models/listing-image";
import { upsertListingImageVector } from "@/lib/qdrant/listing-images";
import { phashPrefix } from "@/lib/intelligence/abuse/phash-buckets";

/**
 * @typedef {Object} ProcessedImagePayload
 * @property {string} url
 * @property {string} [s3Key]
 * @property {string} md5
 * @property {string} phash
 * @property {number[]} [embedding]
 */

/**
 * Upsert processed listing images into MongoDB and Qdrant.
 *
 * @param {Object} params
 * @param {import("mongoose").Document} params.listing
 * @param {ProcessedImagePayload[]} params.images
 * @param {string} params.modelId
 * @returns {Promise<{ persisted: number }>}
 */
export async function persistListingImages({ listing, images, modelId }) {
  let persisted = 0;

  for (const img of images) {
    const filter = { listingId: listing._id, s3Key: img.s3Key || img.url };
    const hasEmbedding = Boolean(img.embedding?.length);
    const update = {
      listingId: listing._id,
      s3Key: img.s3Key || img.url,
      url: img.url,
      md5: img.md5,
      phash: img.phash,
      phashPrefix: phashPrefix(img.phash),
      embeddingModel: modelId,
      hasEmbedding,
      petType: listing.petType,
      listingType: listing.type,
      listingStatus: listing.status,
    };

    let doc;
    try {
      doc = await ListingImage.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: "after",
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      // Race condition: concurrent worker inserted between our check and upsert.
      // Retry as a pure update (no upsert) — the document already exists.
      doc = await ListingImage.findOneAndUpdate(filter, update, {
        returnDocument: "after",
      });
    }

    if (hasEmbedding) {
      await upsertListingImageVector({
        listingImageId: doc._id,
        vector: img.embedding,
        payload: {
          listingId: listing._id,
          listingStatus: listing.status,
          petType: listing.petType,
          listingType: listing.type,
          embeddingModel: modelId,
          userId: listing.userId,
          url: img.url,
          location: listing.location?.coordinates?.length === 2 ? {
            lat: Number(listing.location.coordinates[1]),
            lon: Number(listing.location.coordinates[0]),
          } : undefined,
        },
      });
    }

    persisted += 1;
  }

  return { persisted };
}
