/** @file Request metadata, origin checks, and shared-secret verification. */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { env, isDev } from "@/config/env";

// ---------------------------------------------------------------------------
// Client identity
// ---------------------------------------------------------------------------

/**
 * Resolve client IP from a Headers-like object (NextRequest or next/headers).
 * @param {Headers | { get(name: string): string | null }} headerBag
 * @returns {string}
 */
export function resolveClientIp(headerBag) {
  const cf = headerBag.get("cf-connecting-ip")?.trim();
  const forwarded = headerBag.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headerBag.get("x-real-ip")?.trim();
  return cf || forwarded || real || "unknown";
}

/** @param {import("next/server").NextRequest} request */
export function getClientIpFromRequest(request) {
  return resolveClientIp(request.headers);
}

/** Resolve the client IP in server actions / route handlers. */
export async function getClientIp() {
  return resolveClientIp(await headers());
}

/** Resolve the client user-agent string. */
export async function getUserAgent() {
  const h = await headers();
  return h.get("user-agent") || "unknown";
}

/** Snapshot request metadata stored on moderation reports. */
export async function getRequestMetadata() {
  const [clientIp, userAgent] = await Promise.all([getClientIp(), getUserAgent()]);
  return { clientIp, userAgent };
}

// ---------------------------------------------------------------------------
// Same-origin (browser-facing API routes)
// ---------------------------------------------------------------------------

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const allowedOrigins = new Set(
  [
    normalizeOrigin(env.app.url),
    isDev ? "http://localhost:3000" : null,
    isDev ? "http://127.0.0.1:3000" : null,
  ].filter(Boolean)
);

const BROWSER_FETCH_SITES = new Set(["same-origin", "same-site"]);

/** API paths exempt from browser-only guard (auth callbacks, cron, webhooks, CSP reports). */
const UNGUARDED_API_PREFIXES = [
  "/api/auth",
  "/api/cron/",
  "/api/webhooks/",
  "/api/csp-report",
];

/**
 * Reject external/scraper requests to browser-facing APIs.
 * In production, requires a trusted Origin or same-origin Sec-Fetch-Site.
 * Returns a 403 response or null when allowed.
 *
 * @param {Request} request
 * @returns {NextResponse | null}
 */
export function rejectCrossSiteRequest(request) {
  const pathname = new URL(request.url).pathname;
  if (UNGUARDED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const normalized = normalizeOrigin(origin);
    if (!normalized || !allowedOrigins.has(normalized)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    if (!BROWSER_FETCH_SITES.has(fetchSite)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  }

  if (!isDev) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Secret verification (cron, ML worker, rate-limit bypass)
// ---------------------------------------------------------------------------

/** Constant-time string comparison for secrets and tokens. */
export function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Verify `Authorization: Bearer <secret>`. Returns 401 response or null when valid.
 * @param {Request} request
 * @param {string} secret
 * @returns {NextResponse | null}
 */
export function rejectInvalidBearer(request, secret) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (safeEqual(token, secret)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Check ML/internal worker secret via query `token`, `x-api-key`, or Bearer.
 * @param {Request} request
 * @param {string} secret
 * @returns {boolean}
 */
export function hasValidInternalSecret(request, secret) {
  if (!secret) return false;

  const queryToken = new URL(request.url).searchParams.get("token");
  if (queryToken && safeEqual(queryToken, secret)) return true;

  const apiKey = request.headers.get("x-api-key");
  if (apiKey && safeEqual(apiKey, secret)) return true;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && safeEqual(auth.slice(7), secret)) return true;

  return false;
}

/**
 * Verify ML/internal worker secret via `?token=`, `x-api-key`, or Bearer token.
 * @param {Request} request
 * @param {string} secret
 * @returns {NextResponse | null}
 */
export function rejectInvalidInternalSecret(request, secret) {
  if (hasValidInternalSecret(request, secret)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
