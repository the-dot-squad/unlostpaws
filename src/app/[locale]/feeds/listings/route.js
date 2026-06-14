import { NextResponse } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { normalizeCountryCode } from "@/config/countries";
import { FEED_CACHE_SECONDS } from "@/config/constants/feeds";
import { buildListingsFeed } from "@/lib/feeds/listings";
import { renderAtomFeed } from "@/lib/feeds/formats/atom";
import { renderJsonFeed } from "@/lib/feeds/formats/json-feed";
import { renderRssFeed } from "@/lib/feeds/formats/rss";
import { feedContentType, resolveFeedFormat } from "@/lib/feeds/resolve-format";
import { feedQuerySchema, validate } from "@/lib/validation";

/** @param {import("@/lib/feeds/listings").ListingsFeed} feed */
function renderFeed(feed, format) {
  switch (format) {
    case "atom":
      return renderAtomFeed(feed);
    case "json":
      return renderJsonFeed(feed);
    default:
      return renderRssFeed(feed);
  }
}

export async function GET(request, { params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { searchParams } = new URL(request.url);
  const rawCountry = searchParams.get("country") || undefined;

  const parsed = validate(feedQuerySchema, {
    type: searchParams.get("type") || undefined,
    petType: searchParams.get("petType") || undefined,
    country: rawCountry,
    format: searchParams.get("format") || undefined,
  });

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 });
  }

  const country = normalizeCountryCode(parsed.data.country);
  if (rawCountry && !country) {
    return NextResponse.json({ error: "invalid_country" }, { status: 400 });
  }

  const format = resolveFeedFormat(parsed.data.format, request.headers.get("accept"));
  const filters = {
    type: parsed.data.type,
    petType: parsed.data.petType,
    country,
  };

  const feed = await buildListingsFeed({ locale, filters, format });
  feed.feedUrl = request.url;
  const body = renderFeed(feed, format);

  return new NextResponse(body, {
    headers: {
      "Content-Type": feedContentType(format),
      "Cache-Control": `public, s-maxage=${FEED_CACHE_SECONDS}, stale-while-revalidate=60`,
    },
  });
}
