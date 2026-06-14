/** @file Platform limits, ML worker contract, and admin telemetry collection names. */

// Pagination & map limits
/** Max markers returned per map viewport request. */
export const MAP_LISTINGS_LIMIT = 500;

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
