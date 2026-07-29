/** @file GET /api/listings/map — active listings in a viewport bounding box. */

import { NextResponse } from "next/server";
import { fetchListingsInBounds } from "@/lib/listings/map";
import { mapQuerySchema } from "@/lib/validation";
import { parseValidatedQuery } from "@/lib/api/query-params";
import { MAP_LISTINGS_PAGE_SIZE } from "@/config/constants/platform";
import { rejectCrossSiteRequest } from "@/lib/request-metadata";

/** Browser-only endpoint: active listings in a map bounding box (no contact info). */
export async function GET(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const parsed = parseValidatedQuery(
    {
      swLng: searchParams.get("swLng"),
      swLat: searchParams.get("swLat"),
      neLng: searchParams.get("neLng"),
      neLat: searchParams.get("neLat"),
      type: searchParams.get("type") || undefined,
      petType: searchParams.get("petType") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
      fresh: searchParams.get("fresh") || undefined,
    },
    mapQuerySchema,
    { error: "Invalid query parameters" }
  );
  if (parsed.response) return parsed.response;

  const result = await fetchListingsInBounds({
    ...parsed.data,
    limit: parsed.data.limit ?? MAP_LISTINGS_PAGE_SIZE,
    skipCache: Boolean(parsed.data.fresh),
  });

  return NextResponse.json(result, {
    headers: {
      // Public filters only — short CDN + browser cache; Redis is the shared layer.
      "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
