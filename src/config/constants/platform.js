/** @file Platform limits, ML worker contract, and admin telemetry collection names. */

// Pagination & map limits
/** Hard cap on markers returned per map viewport request. */
export const MAP_LISTINGS_LIMIT = 500;

/** Default page size for map viewport fetches (cursor pagination). */
export const MAP_LISTINGS_PAGE_SIZE = 200;

/** Redis TTL (seconds) for map / geo browse response cache. */
export const LISTINGS_CACHE_TTL_SEC = 45;

/**
 * Max Mongo candidates for cross-type visual matching before Qdrant ANN.
 * Peak cost: ≤ this many listing IDs × ceil(ids/100) Qdrant batches per embedding.
 */
export const GEO_MATCH_CANDIDATE_CAP = 500;

/** Browse listings grid — 4 columns × 6 rows. */
export const LISTINGS_PAGE_SIZE = 24;

/** Admin list pages — shared page size across all sections. */
export const ADMIN_PAGE_SIZE = 50;

// ML worker Redis stream contract — must match unlostpaws-worker/app/config/settings.py
export const ML_JOB_TYPES = ["listing", "owned-pet"];

export const IMAGE_QUEUE_STREAM = "unlostpaws:stream:vision-processing";

export const IMAGE_QUEUE_DLQ_STREAM = "unlostpaws:stream:vision-processing:dlq";

export const IMAGE_QUEUE_CONSUMER_GROUP = "vision-worker";

export const MAX_JOB_ATTEMPTS = 3;

/** MongoDB collection names tracked for admin dashboard storage stats. */
export const TRACKED_COLLECTIONS = [
  "listings",
  "ownedpets",
  "moderationreports",
  "listingmatches",
  "contents",
  "appsettings",
  "listingimages",
  "contactaccesslogs",
  "user",
];
