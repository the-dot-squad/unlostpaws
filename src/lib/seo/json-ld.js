/** @file Helper functions for generating SEO Structured Data (JSON-LD). */

import { SITE_NAME } from "./metadata";

/**
 * Serialize JSON-LD object to string, escaping '<' to prevent XSS injection.
 * @param {object} jsonLd
 */
export function serializeJsonLd(jsonLd) {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

/**
 * Generate JSON-LD for the homepage.
 * @param {string} locale
 */
export function getHomepageJsonLd(locale) {
  const isEn = locale === "en";
  const description = isEn
    ? "Help reunite pets with their families worldwide. Post and browse missing, found, and sighting alerts."
    : "به بازگرداندن حیوانات خانگی به خانواده‌هایشان کمک کنید. اعلان گم‌شده، پیدا شده و مشاهده ثبت و مرور کنید.";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unlostpaws.com";
  const normalizedAppUrl = appUrl.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": SITE_NAME,
    "url": appUrl,
    "description": description,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires HTML5/JavaScript",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD",
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": `${normalizedAppUrl}/favicon-96x96.png`
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${normalizedAppUrl}/${locale}/listings?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Generate JSON-LD for a pet alert listing detail page.
 * @param {object} options
 * @param {object} options.listing
 * @param {string} options.locale
 * @param {string} options.typeLabel — e.g. "Missing" or "Found"
 * @param {string} options.petTypeLabel — e.g. "Dog" or "Cat"
 * @param {string} options.locationLabel — e.g. "Tehran, Iran"
 * @param {string} options.description — dynamic details summary
 */
export function getListingJsonLd({
  listing,
  locale,
  typeLabel,
  petTypeLabel,
  locationLabel,
  description,
  title,
}) {
  const resolvedTitle = title || `${typeLabel} ${petTypeLabel} — ${listing.color}`;
  const id = listing.publicId || listing._id?.toString() || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unlostpaws.com";
  const canonicalUrl = `${appUrl.replace(/\/$/, "")}/${locale}/listings/${id}`;

  const imageList = Array.isArray(listing.images)
    ? listing.images.map((img) => img.url).filter(Boolean)
    : [];

  return {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    "url": canonicalUrl,
    "name": resolvedTitle,
    "description": description || resolvedTitle,
    "mainEntity": {
      "@type": "Message",
      "about": {
        "@type": "Animal",
        "name": petTypeLabel,
        "color": listing.color,
        "breed": listing.breed || undefined,
        "image": imageList.length > 0 ? imageList : undefined,
      },
      "text": listing.description || resolvedTitle,
      "dateCreated": listing.createdAt,
      "dateModified": listing.updatedAt,
      "contentLocation": locationLabel
        ? {
            "@type": "Place",
            "name": locationLabel,
          }
        : undefined,
    },
  };
}

export function getFaqJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": (item.answerHtml || "").replace(/<[^>]*>/g, ""), // strip raw HTML tags
      },
    })),
  };
}
