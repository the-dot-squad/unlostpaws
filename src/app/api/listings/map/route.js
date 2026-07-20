import { NextResponse } from "next/server";
import { fetchListingsInBounds } from "@/lib/listings/map-search";
import { validate, mapQuerySchema } from "@/lib/validation";
import { MAP_LISTINGS_LIMIT } from "@/config/constants/platform";
import { rejectCrossSiteRequest } from "@/lib/request-metadata";

/** Browser-only endpoint: active listings in a map bounding box (no contact info). */
export async function GET(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const parsed = validate(mapQuerySchema, {
    swLng: searchParams.get("swLng"),
    swLat: searchParams.get("swLat"),
    neLng: searchParams.get("neLng"),
    neLat: searchParams.get("neLat"),
    type: searchParams.get("type") || undefined,
    petType: searchParams.get("petType") || undefined,
  });

  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { listings, truncated } = await fetchListingsInBounds({
    ...parsed.data,
    limit: MAP_LISTINGS_LIMIT,
  });

  return NextResponse.json({ listings, truncated, limit: MAP_LISTINGS_LIMIT });
}
