import { ROUTE_CONTENT_SLUGS, ROUTE_PATHS } from "@/config/constants/site-routes";

/** Locales to revalidate when a CMS slug changes. */
export function routesForContentSlug(slug) {
  return Object.entries(ROUTE_CONTENT_SLUGS)
    .filter(([, cmsSlug]) => cmsSlug === slug)
    .map(([route]) => ROUTE_PATHS[route] ?? route);
}
