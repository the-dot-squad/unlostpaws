import enMessages from "@messages/en.json";
import faMessages from "@messages/fa.json";
import { ROUTE_CONTENT_SLUGS } from "@/config/constants/site-routes";

const MESSAGES_BY_LOCALE = { en: enMessages, fa: faMessages };

/** @returns {import("@/models/content").Content | null} */
function faqFallback(locale) {
  const faq = (MESSAGES_BY_LOCALE[locale] ?? enMessages).pages.faq;
  const items = faq.items.map((item) => `<li>${item.q}:${item.a}</li>`).join("");

  return {
    title: faq.title,
    slug: ROUTE_CONTENT_SLUGS.faq,
    locale,
    excerpt: faq.heroSubtitle,
    body: `<p>${faq.intro}</p><ul>${items}</ul>`,
  };
}

function aboutFallback(locale) {
  const p = (MESSAGES_BY_LOCALE[locale] ?? enMessages).pages.about;

  return {
    title: p.title,
    slug: ROUTE_CONTENT_SLUGS.about,
    locale,
    excerpt: p.heroSubtitle,
    body: [
      `<p>${p.intro}</p>`,
      `<h2>${p.missionTitle}</h2><p>${p.mission}</p>`,
      `<h2>${p.howTitle}</h2><p>${p.how1}</p>`,
      `<h2>${p.communityTitle}</h2><p>${p.community}</p>`,
      `<h2>${p.howTitle}</h2>`,
      `<ul><li>${p.how1}</li><li>${p.how2}</li><li>${p.how3}</li></ul>`,
    ].join(""),
  };
}

function policyFallback(slug, locale, key) {
  const p = (MESSAGES_BY_LOCALE[locale] ?? enMessages).pages[key];
  const sections = [1, 2, 3, 4, 5, 6]
    .map((n) => `<h2>${p[`s${n}Title`]}</h2><p>${p[`s${n}`]}</p>`)
    .join("");

  return {
    title: p.title,
    slug,
    locale,
    excerpt: p.heroSubtitle,
    body: `<p>${p.lastUpdated}</p>${sections}`,
  };
}

const FALLBACK_BUILDERS = {
  [ROUTE_CONTENT_SLUGS.faq]: faqFallback,
  [ROUTE_CONTENT_SLUGS.about]: aboutFallback,
  [ROUTE_CONTENT_SLUGS.terms]: (locale) =>
    policyFallback(ROUTE_CONTENT_SLUGS.terms, locale, "terms"),
  [ROUTE_CONTENT_SLUGS.privacy]: (locale) =>
    policyFallback(ROUTE_CONTENT_SLUGS.privacy, locale, "privacy"),
};

/**
 * Bootstrap content from translation files when nothing exists in the CMS yet.
 * Once an admin saves an entry, the database version takes over.
 */
export function getMessageFallbackContent(slug, locale) {
  const build = FALLBACK_BUILDERS[slug];
  return build ? build(locale) : null;
}
