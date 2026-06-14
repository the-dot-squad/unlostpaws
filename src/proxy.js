import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { applyProxyRateLimit } from "./lib/rate-limit";
import { rejectCrossSiteRequest } from "./lib/request-metadata";

const intlMiddleware = createMiddleware(routing);

/** Admin and public assets live outside the [locale] segment. */
function redirectLocalePrefixedPath(request, pattern, targetPrefix) {
  const match = request.nextUrl.pathname.match(pattern);
  if (!match) return null;
  const url = request.nextUrl.clone();
  url.pathname = `${targetPrefix}${match[2] || ""}`;
  return NextResponse.redirect(url);
}

export async function proxy(request) {
  const blocked = await applyProxyRateLimit(request);
  if (blocked) {
    return blocked;
  }

  const { pathname } = request.nextUrl;

  const adminRedirect = redirectLocalePrefixedPath(
    request,
    /^\/(en|fa)(\/admin(?:\/.*)?)$/,
    ""
  );
  if (adminRedirect) return adminRedirect;

  const assetRedirect = redirectLocalePrefixedPath(
    request,
    /^\/(en|fa)(\/(?:site\.webmanifest|favicon\.ico|favicon\.svg|favicon-96x96\.png|apple-touch-icon\.png|dotlottie-player\.wasm|web-app-manifest-.*))$/,
    ""
  );
  if (assetRedirect) return assetRedirect;

  if (pathname.startsWith("/api")) {
    const blockedApi = rejectCrossSiteRequest(request);
    if (blockedApi) return blockedApi;
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|lottie|wasm|woff2?|css|js|map)$).*)",
  ],
};
