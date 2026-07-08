/** @file Client-safe `NEXT_PUBLIC_*` values — import this in client components, not env.js. */

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/the-dot-squad/unlostpaws",
};
