/** @file Match server actions — missing-owner reunion decisions. */
"use server";

import { connectDB } from "@/config/db";
import { withAuthAction } from "@/lib/auth/session";
import { ListingMatch } from "@/models/listing-match";
import {
  confirmReunionMatch,
  dismissReunionMatch,
  isMissingListingOwner,
} from "@/lib/intelligence/matching/reunion";
import { updateMatchStatusSchema, validate } from "@/lib/validation";
import { revalidatePath } from "next/cache";

/** Confirm or dismiss a reunification match (missing alert owner only). */
export async function updateMatchStatus(matchId, status) {
  return withAuthAction("updateMatchStatus", async (session) => {
    const parsed = validate(updateMatchStatusSchema, { matchId, status });
    if (!parsed.ok) return { error: "validation_failed" };

    await connectDB();

    const match = await ListingMatch.findById(parsed.data.matchId);
    if (!match) return { error: "not_found" };

    if (match.tier !== "reunification") {
      return { error: "not_decidable" };
    }

    if (!isMissingListingOwner(match, session.user.id)) {
      return { error: "forbidden" };
    }

    const result =
      parsed.data.status === "confirmed"
        ? await confirmReunionMatch(match, session.user.id)
        : await dismissReunionMatch(match, session.user.id);

    if (result.error) return { error: result.error };

    revalidatePath("/");
    return { success: true };
  });
}
