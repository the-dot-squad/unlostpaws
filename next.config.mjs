import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const isProd = process.env.NODE_ENV === "production";

let mediaHost = "localhost";
try {
  mediaHost = new URL(appUrl).hostname;
} catch {
  // keep localhost default
}

let s3Host = null;
let s3Proto = "https";
if (process.env.S3_PUBLIC_URL) {
  try {
    const s3UrlString = process.env.S3_PUBLIC_URL.includes("://")
      ? process.env.S3_PUBLIC_URL
      : `https://${process.env.S3_PUBLIC_URL}`;
    const url = new URL(s3UrlString);
    s3Host = url.hostname;
    s3Proto = url.protocol.replace(":", "");
  } catch {
    // Keep null
  }
}

const cspReportUri = "/api/csp-report";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'wasm-unsafe-eval'",
  "https://challenges.cloudflare.com",
  "https://www.googletagmanager.com",
].join(" ");

const cspHeader = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https: http:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://www.google-analytics.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
  "wasm-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `report-uri ${cspReportUri}`,
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose", "mongodb", "@qdrant/js-client-rest"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: mediaHost },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      ...(s3Host ? [{ protocol: s3Proto, hostname: s3Host }] : []),
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
    ];

    if (isProd) {
      securityHeaders.push({ key: "Content-Security-Policy", value: cspHeader });
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
