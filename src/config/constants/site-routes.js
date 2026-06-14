/**
 * Maps public Next.js routes to CMS slugs.
 * Routes stay fixed (/about); admins create content with the matching slug.
 */
export const ROUTE_CONTENT_SLUGS = {
  about: "about",
  terms: "terms",
  privacy: "privacy",
  faq: "faq",
};

/** Public URL paths when they differ from ROUTE_CONTENT_SLUGS keys. */
export const ROUTE_PATHS = {
  privacy: "terms/privacy",
};
