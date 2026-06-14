import { NextResponse } from "next/server";
import { isDev } from "@/config/env";
import { reverseGeocode } from "@/lib/nominatim";
import { validate, reverseGeocodeQuerySchema } from "@/lib/validation";
import { getClientIpFromRequest, rejectCrossSiteRequest } from "@/lib/request-metadata";
import { checkIpRateLimits } from "@/lib/rate-limit/ip";

/** Reverse geocode lat/lng via Nominatim (server-side proxy). */
export async function GET(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  try {
    const ipCheck = await checkIpRateLimits(getClientIpFromRequest(request));
    if (!ipCheck.allowed) {
      return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
    }
  } catch (err) {
    if (isDev) {
      // Rate limit store unavailable in dev — allow request.
    } else {
      console.error("[geocode] rate limit check failed:", err);
      return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
    }
  }

  const { searchParams } = new URL(request.url);
  const parsed = validate(reverseGeocodeQuerySchema, {
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });

  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const result = await reverseGeocode(parsed.data.lat, parsed.data.lng);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 502;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
