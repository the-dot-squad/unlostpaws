import { locales } from "@/i18n/routing";
import { absoluteUrl, localeAlternates, PUBLIC_STATIC_PATHS } from "@/lib/seo/routes";
import { listActiveListingSitemapEntries } from "@/lib/seo/sitemap-entries";

/** @returns {import("next").MetadataRoute.Sitemap} */
export default async function sitemap() {
  const staticEntries = PUBLIC_STATIC_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      lastModified: new Date(),
      changeFrequency: path === "" ? "daily" : path === "listings" ? "hourly" : "weekly",
      priority: path === "" ? 1 : path === "listings" ? 0.9 : 0.7,
      alternates: { languages: localeAlternates(path) },
    }))
  );

  const listings = await listActiveListingSitemapEntries();
  const listingEntries = listings.flatMap(({ publicId, updatedAt }) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale, `listings/${publicId}`),
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: { languages: localeAlternates(`listings/${publicId}`) },
    }))
  );

  return [...staticEntries, ...listingEntries];
}
