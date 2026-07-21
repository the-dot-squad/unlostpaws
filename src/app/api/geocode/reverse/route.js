import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/nominatim";
import { reverseGeocodeQuerySchema } from "@/lib/validation";
import { parseValidatedQuery } from "@/lib/api/query-params";
import { rejectCrossSiteRequest } from "@/lib/request-metadata";

/** Reverse geocode lat/lng via Nominatim (server-side proxy). */
export async function GET(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const parsed = parseValidatedQuery(
    { lat: searchParams.get("lat"), lng: searchParams.get("lng") },
    reverseGeocodeQuerySchema,
    { error: "Invalid coordinates" }
  );
  if (parsed.response) return parsed.response;

  const result = await reverseGeocode(parsed.data.lat, parsed.data.lng);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 502;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
