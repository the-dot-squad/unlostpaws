/** @file User account lifecycle — purge app data and auth record. */

import { cache } from "react";
import { connectDB } from "@/config/db";
import { deleteAuthUserById } from "@/lib/auth/users";
import { findUserByPublicId } from "@/lib/public-id";
import { deleteListingCompletely } from "@/lib/listings/purge-listing";
import { deleteOwnedPetVector } from "@/lib/qdrant/owned-pets";
import { deleteStoredMedia } from "@/lib/storage/delete";
import { Listing } from "@/models/listing";
import { ListingMatch } from "@/models/listing-match";
import { ModerationReport } from "@/models/moderation-report";
import { OwnedPet } from "@/models/owned-pet";

/** Remove moderation and match records that still reference a user id. */
async function purgeUserReferences(userId) {
  await Promise.all([
    ModerationReport.deleteMany({ reporterId: userId }),
    ListingMatch.deleteMany({
      $or: [{ listingAUserId: userId }, { listingBUserId: userId }],
    }),
  ]);
}

/**
 * Permanently delete a user account, all owned data, and the better-auth record.
 *
 * @param {{ id: string }} user Normalized auth user from {@link import("@/lib/auth/users").normalizeAuthUser}
 */
export async function purgeUserAccount(user) {
  await connectDB();

  const listings = await Listing.find({ userId: user.id }).select("_id images").lean();

  for (const listing of listings) {
    await deleteListingCompletely(listing);
  }

  const pets = await OwnedPet.find({ userId: user.id }).lean();
  for (const pet of pets) {
    if (pet.photo) await deleteStoredMedia(pet.photo);
    if (pet.photo2) await deleteStoredMedia(pet.photo2);
    if (pet.passportPhoto) await deleteStoredMedia(pet.passportPhoto);
    try {
      await deleteOwnedPetVector(pet._id);
    } catch {
      // Qdrant may be unavailable
    }
  }
  await OwnedPet.deleteMany({ userId: user.id });

  await purgeUserReferences(user.id);
  await deleteAuthUserById(user.id);
}

/** Cached public profile fetch — shared by page render and generateMetadata. */
export const getUserForPage = cache(async (publicId) => {
  return findUserByPublicId(publicId, {
    name: 1,
    image: 1,
    country: 1,
    city: 1,
    createdAt: 1,
    banned: 1,
    publicId: 1,
  });
});
