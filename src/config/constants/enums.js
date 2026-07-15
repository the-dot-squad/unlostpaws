/** @file Domain enumerations shared by models, validation, and UI. */

export const LISTING_TYPES = ["missing", "found", "sighting", "surrender"];

export const LISTING_STATUSES = ["active", "resolved", "expired", "removed", "under_review"];

export const PROCESSING_STATUSES = ["pending", "processing", "ready", "failed"];

export const PET_TYPES = ["dog", "cat", "bird", "rabbit", "hamster", "fish", "reptile", "horse", "monkey", "other"];

export const REPORT_REASONS = ["spam", "fake", "inappropriate", "duplicate", "other"];

export const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"];

/** Admin case resolution actions (applied to all open reports in a case). */
export const REPORT_CASE_ACTIONS = [
  "dismiss",
  "confirm_violation",
  "remove_listing",
  "purge_listing",
];

export const MATCH_STATUSES = ["pending", "notified", "dismissed", "confirmed"];

export const MATCH_TIERS = ["reunification", "corroboration"];

export const CONFIDENCE_TIERS = ["high", "medium"];

export const USER_ROLES = ["user", "moderator", "admin"];

export const MIN_LISTING_IMAGES = 2;

export const MAX_LISTING_IMAGES = 8;

export const MAX_PET_PHOTOS = 2;

export const PHASH_DISTANCE_THRESHOLD = 5;

export const OWNED_PET_STATUSES = ["active", "archived", "removed"];
