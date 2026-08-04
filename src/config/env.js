/** @file Central environment configuration — the only server-side env module. */



export const isDev = process.env.NODE_ENV === "development";
export const isProd = process.env.NODE_ENV === "production";

const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_EMAIL_FROM = "noreply@unlostpaws.com";
const DEFAULT_NOMINATIM_EMAIL = "support@unlostpaws.com";

/** Values documented in .env.example — rejected in production. */
const INSECURE_VALUE_PREFIX = "dev-";

function requireEnv(name, value) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

function isInsecureDevDefault(value) {
  return typeof value === "string" && value.startsWith(INSECURE_VALUE_PREFIX);
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
  const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
  const webhookSecret = process.env.WEBHOOK_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const publicIdSalt = process.env.PUBLIC_ID_SALT?.trim();

  if (!authSecret) missing.push("BETTER_AUTH_SECRET");
  else if (authSecret.length < 32 || isInsecureDevDefault(authSecret)) {
    missing.push("BETTER_AUTH_SECRET (insecure dev default)");
  }

  if (!webhookSecret) missing.push("WEBHOOK_SECRET");
  else if (isInsecureDevDefault(webhookSecret)) {
    missing.push("WEBHOOK_SECRET (insecure dev default)");
  }

  if (!cronSecret) missing.push("CRON_SECRET");
  else if (isInsecureDevDefault(cronSecret)) {
    missing.push("CRON_SECRET (insecure dev default)");
  }

  if (!publicIdSalt) missing.push("PUBLIC_ID_SALT");
  else if (isInsecureDevDefault(publicIdSalt)) {
    missing.push("PUBLIC_ID_SALT (insecure dev default)");
  }

  if (missing.length) {
    throw new Error(`Production requires secure env vars: ${missing.join(", ")}`);
  }
}

const databaseUrl = requireEnv("DATABASE_URL", process.env.DATABASE_URL);
const authSecret = requireEnv("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET);
const webhookSecret = requireEnv("WEBHOOK_SECRET", process.env.WEBHOOK_SECRET);
const cronSecret = requireEnv("CRON_SECRET", process.env.CRON_SECRET);
const publicIdSalt = requireEnv("PUBLIC_ID_SALT", process.env.PUBLIC_ID_SALT);

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
    url: process.env.UPSTASH_REDIS_REST_URL?.trim() || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "",
  },

  auth: {
    secret: authSecret,
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
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID?.trim() || "common",
    },
  },

  storage,

  email: {
    provider: process.env.EMAIL_PROVIDER || "mailtrap",
    from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
    mailtrap: {
      token: process.env.MAILTRAP_TOKEN,
      sandboxId: process.env.MAILTRAP_SANDBOX_ID,
      apiOrigin:
        process.env.MAILTRAP_API_ORIGIN?.trim() || "https://sandbox.api.mailtrap.io",
    },
    mailjet: {
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
      apiOrigin:
        process.env.MAILJET_API_ORIGIN?.trim() || "https://api.mailjet.com/v3.1/send",
    },
    zeptomail: {
      token: process.env.ZEPTOMAIL_TOKEN,
      apiOrigin:
        process.env.ZEPTOMAIL_API_ORIGIN?.trim() || "https://api.zeptomail.com/v1.1/email",
    },
  },

  webhook: {
    secret: webhookSecret,
  },

  cron: {
    secret: cronSecret,
    matchReprocessLimit: Math.max(1, Number(process.env.CRON_MATCH_REPROCESS_LIMIT || 15)),
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

  uploadRateLimit: {
    enabled:
      process.env.UPLOAD_RATE_LIMIT_ENABLED !== undefined
        ? process.env.UPLOAD_RATE_LIMIT_ENABLED === "true"
        : !isDev,
    maxRequests: Math.max(1, Number(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS || 40)),
    windowSeconds: Math.max(1, Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS || 60)),
    useMemoryFallback: isDev && process.env.UPLOAD_RATE_LIMIT_DEV_MEMORY !== "false",
  },

  content: {
    apiBaseUrl:
      process.env.DGCONTENT_API_BASE_URL || "https://dgtteam-content.vercel.app/api",
    apiKey: process.env.DGCONTENT_API_KEY || "",
  },

  publicId: {
    salt: publicIdSalt,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    channelId: process.env.TELEGRAM_CHANNEL_ID?.trim() || "",
    get enabled() {
      return Boolean(this.botToken && this.channelId);
    },
  },
};

/** @returns {"redis" | "memory" | "off"} */
export function resolveUploadRateLimitStore() {
  const { uploadRateLimit, redis } = env;
  if (!uploadRateLimit.enabled) return "off";
  if (redis.url && redis.token) return "redis";
  if (uploadRateLimit.useMemoryFallback) return "memory";
  return "off";
}

/** Admin settings UI — upload Redis limits and Vercel general API note. */
export function getRateLimitDisplayConfig() {
  const adapter = resolveUploadRateLimitStore();
  return {
    enabled: env.uploadRateLimit.enabled,
    active: adapter !== "off",
    adapter,
    uploadMaxRequests: env.uploadRateLimit.maxRequests,
    windowSeconds: env.uploadRateLimit.windowSeconds,
  };
}

export { assertProductionSecrets };
