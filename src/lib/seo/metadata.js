/** @file Next.js Metadata API builders for site-wide SEO. */

import { env } from "@/config/env";
import { absoluteUrl, localeAlternates } from "@/lib/seo/routes";

export const SITE_NAME = "UnLostPaws";
export const DEFAULT_OG_IMAGE = "/og-image.png";

/** @type {import("next").Metadata["metadataBase"]} */
export const metadataBase = new URL(env.app.url);

const NOINDEX_ROBOTS = { index: false, follow: false };

/**
 * Shared site-wide metadata defaults (root layout).
 * @returns {import("next").Metadata}
 */
export function rootMetadata() {
  return {
    metadataBase,
    title: {
      default: `${SITE_NAME} — Lost & Found Pets`,
      template: `%s | ${SITE_NAME}`,
    },
    description: "Help reunite pets with their families worldwide",
    applicationName: SITE_NAME,
    icons: {
      icon: [
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      title: SITE_NAME,
    },
    manifest: "/site.webmanifest",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * Build page-level metadata with locale alternates and social cards.
 * @param {object} options
 * @param {string} options.locale
 * @param {string} options.title — page title (template adds site name)
 * @param {string} options.description
 * @param {string} [options.path] — segment after /{locale}/
 * @param {string} [options.image] — absolute or root-relative OG image
 * @param {boolean} [options.noIndex]
 * @returns {import("next").Metadata}
 */
export function buildPageMetadata({ locale, title, description, path = "", image, noIndex }) {
  const canonical = absoluteUrl(locale, path);

  let ogImage = image;
  if (!ogImage) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unlostpaws.com";
    const baseUrl = appUrl.replace(/\/$/, "");
    if (path.startsWith("listings/") && path !== "listings/new" && path !== "listings") {
      const id = path.split("/")[1];
      ogImage = `${baseUrl}/api/og?locale=en&id=${id}`;
    } else {
      const ogTitle = typeof title === "object" && title !== null
        ? (title.absolute || title.default || "")
        : title;
      const encodedTitle = encodeURIComponent(ogTitle || "");
      const encodedDesc = encodeURIComponent(description || "");
      ogImage = `${baseUrl}/api/og?locale=en&title=${encodedTitle}&desc=${encodedDesc}`;
    }
  }

  const ogTitle = typeof title === "object" && title !== null
    ? (title.absolute || title.default || "")
    : title;

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical,
      languages: localeAlternates(path),
    },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      locale,
      images: [{ url: ogImage }],
    },
    twitter: {
      title: ogTitle,
      description,
      images: [ogImage],
    },
    ...(noIndex ? { robots: NOINDEX_ROBOTS } : {}),
  };
}

/** @returns {import("next").Metadata} */
export function noIndexMetadata(title) {
  return {
    metadataBase,
    title,
    robots: NOINDEX_ROBOTS,
  };
}
