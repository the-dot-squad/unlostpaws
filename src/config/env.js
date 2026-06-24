/** @file Central environment configuration — the only server-side env module. */

import { resolveRedisUrl } from "@/lib/redis/resolve-url";

export const isDev = process.env.NODE_ENV === "development";
export const isProd = process.env.NODE_ENV === "production";

const DEV_AUTH_SECRET = "dev-secret-change-in-production-min-32-chars";
const DEV_WEBHOOK_SECRET = "dev-webhook-secret";
const DEV_CRON_SECRET = "dev-cron-secret";
const DEV_PUBLIC_ID_SALT = "dev-public-id-salt-change-in-production";

const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_EMAIL_FROM = "noreply@unlostpaws.com";
const DEFAULT_NOMINATIM_EMAIL = "support@unlostpaws.com";

function requireEnv(name, value) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

function resolveStorageConfig() {
  const mode = process.env.STORAGE_MODE;
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKey = process.env.S3_ACCESS_KEY?.trim();
  const secretKey = process.env.S3_SECRET_KEY?.trim();
  const bucket = process.env.S3_BUCKET?.trim() || "unlostpaws";
  const publicUrl = process.env.S3_PUBLIC_URL?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

  const normalizedEndpoint = endpoint?.replace(/\/$/, "");
  let normalizedPublicUrl = publicUrl?.replace(/\/$/, "");
  if (normalizedPublicUrl && !normalizedPublicUrl.includes("://")) {
    normalizedPublicUrl = `https://${normalizedPublicUrl}`;
  }

  const credentials = {
    endpoint: normalizedEndpoint,
    bucket,
    region,
    accessKey,
    secretKey,
    publicUrl: normalizedPublicUrl,
    forcePathStyle,
  };

  const isFullyConfigured = Boolean(endpoint && accessKey && secretKey && publicUrl);

  if (mode === "local" || (mode !== "s3" && !isFullyConfigured)) {
    return { mode: "local", ...credentials };
  }

  const missing = [];
  if (!endpoint) missing.push("S3_ENDPOINT");
  if (!accessKey) missing.push("S3_ACCESS_KEY");
  if (!secretKey) missing.push("S3_SECRET_KEY");
  if (!publicUrl) missing.push("S3_PUBLIC_URL");

  if (missing.length) {
    throw new Error(`S3 storage requires: ${missing.join(", ")}`);
  }

  if (normalizedEndpoint?.endsWith(`/${bucket}`)) {
    throw new Error(
      `S3_ENDPOINT must not include the bucket name — set S3_BUCKET=${bucket} separately`
    );
  }

  return { mode: "s3", ...credentials };
}

function assertProductionSecrets() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!isProd) return;

  const missing = [];
  const authSecret = process.env.BETTER_AUTH_SECRET;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const publicIdSalt = process.env.PUBLIC_ID_SALT;

  if (!authSecret) missing.push("BETTER_AUTH_SECRET");
  else if (authSecret === DEV_AUTH_SECRET) missing.push("BETTER_AUTH_SECRET (dev default)");

  if (!webhookSecret) missing.push("WEBHOOK_SECRET");
  else if (webhookSecret === DEV_WEBHOOK_SECRET) missing.push("WEBHOOK_SECRET (dev default)");

  if (!cronSecret) missing.push("CRON_SECRET");
  else if (cronSecret === DEV_CRON_SECRET) missing.push("CRON_SECRET (dev default)");

  if (!publicIdSalt) missing.push("PUBLIC_ID_SALT");
  else if (publicIdSalt === DEV_PUBLIC_ID_SALT) missing.push("PUBLIC_ID_SALT (dev default)");

  if (missing.length) {
    throw new Error(`Production requires secure env vars: ${missing.join(", ")}`);
  }
}

const databaseUrl = requireEnv("DATABASE_URL", process.env.DATABASE_URL);
const redisUrl = resolveRedisUrl(process.env.REDIS_URL, process.env.REDIS_PASSWORD);
const storage = resolveStorageConfig();

assertProductionSecrets();

export const env = {
  nodeEnv: process.env.NODE_ENV,
  isDev,
  isProd,
  runtime: process.env.NEXT_RUNTIME,

  app: {
    url: process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL,
  },

  db: {
    url: databaseUrl,
  },

  redis: {
    url: redisUrl,
  },

  auth: {
    secret: process.env.BETTER_AUTH_SECRET || DEV_AUTH_SECRET,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    },
  },

  storage,

  email: {
    provider: process.env.EMAIL_PROVIDER || "mailtrap",
    from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
    mailtrap: {
      token: process.env.MAILTRAP_TOKEN,
      sandboxId: process.env.MAILTRAP_SANDBOX_ID,
    },
    mailjet: {
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    },
    zeptomail: {
      token: process.env.ZEPTOMAIL_TOKEN,
    },
  },

  webhook: {
    secret: process.env.WEBHOOK_SECRET || DEV_WEBHOOK_SECRET,
  },

  cron: {
    secret: process.env.CRON_SECRET || DEV_CRON_SECRET,
  },

  qdrant: {
    url: process.env.QDRANT_URL || "",
    apiKey: process.env.QDRANT_API_KEY || "",
    vectorSize: Number(process.env.QDRANT_VECTOR_SIZE || 768),
    scalarQuantization: process.env.QDRANT_SCALAR_QUANTIZATION === "true",
  },

  nominatim: {
    contactEmail: process.env.NOMINATIM_CONTACT_EMAIL || DEFAULT_NOMINATIM_EMAIL,
  },

  contact: {
    inboxEmail:
      process.env.CONTACT_INBOX_EMAIL ||
      process.env.NOMINATIM_CONTACT_EMAIL ||
      DEFAULT_NOMINATIM_EMAIL,
  },

  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    secretKey: process.env.TURNSTILE_SECRET_KEY || "",
  },

  analytics: {
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    maxRequests: Math.max(1, Number(process.env.RATE_LIMIT_MAX_REQUESTS || 200)),
    windowSeconds: Math.max(1, Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60)),
    uploadMaxRequests: Math.max(1, Number(process.env.RATE_LIMIT_UPLOAD_MAX_REQUESTS || 40)),
    useMemoryFallback: isDev && process.env.RATE_LIMIT_DEV_MEMORY !== "false",
  },

  content: {
    apiBaseUrl:
      process.env.DGCONTENT_API_BASE_URL || "https://dgtteam-content.vercel.app/api",
    apiKey: process.env.DGCONTENT_API_KEY || "",
    websiteKey: process.env.DGCONTENT_WEBSITE_KEY || "",
  },

  publicId: {
    salt: process.env.PUBLIC_ID_SALT || DEV_PUBLIC_ID_SALT,
  },
};

/** @returns {"redis" | "memory" | "off"} */
export function resolveIpRateLimitStore() {
  const { rateLimit, redis } = env;
  if (!rateLimit.enabled) return "off";
  if (redis.url) return "redis";
  if (rateLimit.useMemoryFallback) return "memory";
  return "off";
}

/** Admin settings UI — IP rate limit summary. */
export function getRateLimitDisplayConfig() {
  const adapter = resolveIpRateLimitStore();
  return {
    enabled: env.rateLimit.enabled,
    active: adapter !== "off",
    adapter,
    maxRequests: env.rateLimit.maxRequests,
    windowSeconds: env.rateLimit.windowSeconds,
    uploadMaxRequests: env.rateLimit.uploadMaxRequests,
  };
}

export { assertProductionSecrets };
