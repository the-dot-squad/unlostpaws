import { env } from "@/config/env";
import { locales } from "@/i18n/routing";

/** @returns {import("next").MetadataRoute.Robots} */
export default function robots() {
  const disallow = [
    "/admin",
    "/api",
    ...locales.flatMap((locale) => [
      `/${locale}/account`,
      `/${locale}/login`,
      `/${locale}/listings/new`,
    ]),
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${env.app.url.replace(/\/$/, "")}/sitemap.xml`,
  };
}
