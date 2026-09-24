/** @file Zod schemas and helpers for API routes and server actions. */

import { z } from "zod";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";
import {
  LISTING_STATUSES,
  LISTING_TYPES,
  MAX_LISTING_IMAGES,
  MIN_LISTING_IMAGES,
  OWNED_PET_STATUSES,
  PET_TYPES,
  REPORT_CASE_ACTIONS,
  REPORT_REASONS,
  USER_ROLES,
} from "@/config/constants/enums";
import {
  MAX_ADDRESS,
  MAX_ADMIN_NOTE,
  MAX_BREED,
  MAX_CITY,
  MAX_COLOR,
  MAX_CONTACT_MESSAGE,
  MAX_CONTACT_TOPIC,
  MAX_COUNTRY,
  MAX_DESCRIPTION,
  MAX_NAME,
  MAX_NOTE,
  MAX_OTP_CODE,
  MAX_REPORT_DETAILS,
  MAX_USERNAME,
} from "@/config/constants/field-limits";
import { FEED_FORMATS } from "@/config/constants/feeds";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";
import { RESERVED_USERNAMES } from "@/config/constants/usernames";

const localeSchema = z.enum(["en", "fa"]);

/** Required trimmed string with max length. */
function requiredTrimmedMax(max, tooLongMessage = "too_long") {
  return z.string().trim().min(1, "required").max(max, tooLongMessage);
}

/** Optional string; empty after trim becomes undefined; max length when present. */
function optionalTrimmedMax(max, tooLongMessage = "too_long") {
  return z
    .string()
    .max(max, tooLongMessage)
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() || "";
      return trimmed || undefined;
    });
}

/** Optional country: empty or ISO-2. */
const optionalCountrySchema = z
  .string()
  .optional()
  .transform((value) => value?.trim().toUpperCase() || "")
  .refine((value) => !value || value.length === MAX_COUNTRY, { message: "invalid_country" });

/**
 * @template T
 * @typedef {object} ValidationOk
 * @property {true} ok
 * @property {T} data
 */

/**
 * @typedef {object} ValidationErr
 * @property {false} ok
 * @property {string} error Machine-readable error code.
 * @property {string} [field] Dot-separated path to the failing field.
 */

/**
 * Parse input with a Zod schema and return a simple result for actions/routes.
 *
 * @template {z.ZodType} T
 * @param {T} schema
 * @param {unknown} data
 * @returns {ValidationOk<z.infer<T>> | ValidationErr}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const issue = result.error.issues[0];
  return {
    ok: false,
    error: issue?.message ?? "validation_failed",
    field: issue?.path?.length ? issue.path.join(".") : undefined,
  };
}

/** Optional phone number — empty string becomes `null`, valid numbers become E.164. */
export const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || "")
  .refine((value) => !value || isValidPhoneNumber(value), { message: "invalid_phone" })
  .transform((value) => {
    if (!value) return null;
    return parsePhoneNumberFromString(value).format("E.164");
  });

/** 15-digit ISO microchip ID (whitespace and dashes stripped). */
export const microchipSchema = z
  .string({ required_error: "required" })
  .min(1, "required")
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => /^\d{15}$/.test(value), { message: "invalid_format" });

/** Uploaded image reference stored on listings and owned pets. */
export const imageRefSchema = z.object({
  url: z.string().min(1),
  s3Key: z.string().min(1),
  bytes: z.number().optional(),
  contentType: z.string().optional(),
});

/** Map viewport bounding-box query parameters. */
export const mapQuerySchema = z.object({
  swLng: z.coerce.number().min(-180).max(180),
  swLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
  neLat: z.coerce.number().min(-90).max(90),
  type: z.enum(LISTING_TYPES).optional(),
  petType: z.enum(PET_TYPES).optional(),
  /** Cursor from a previous response (`createdAtISO_objectId`). */
  cursor: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  /** When "1", skip Redis and force a fresh Mongo read. */
  fresh: z
    .enum(["0", "1"])
    .optional()
    .transform((v) => v === "1"),
});

/** Listing syndication feed query parameters. */
export const feedQuerySchema = z.object({
  type: z.enum(LISTING_TYPES).optional(),
  petType: z.enum(PET_TYPES).optional(),
  country: z.string().optional(),
  format: z.enum(FEED_FORMATS).optional(),
});

/** Presigned upload request body — JPEG and PNG only. */
export const presignUploadSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png"], { message: "invalid_image_type" }),
  extension: z
    .string()
    .min(1)
    .transform((value) => value.toLowerCase())
    .refine((ext) => ALLOWED_IMAGE_EXTENSIONS.includes(ext), {
      message: "invalid_image_extension",
    }),
  prefix: z.enum(["listings", "pets", "avatars", "content"]).default("listings"),
});

/** Reverse geocode query parameters. */
export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const invalidZeroCoordinatesRefine = {
  message: "invalid_coordinates",
  path: ["lng"],
  refine: ({ lng, lat }) => !(lng === 0 && lat === 0),
};

const listingLocationFieldShape = {
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  address: optionalTrimmedMax(MAX_ADDRESS, "address_too_long"),
  city: optionalTrimmedMax(MAX_CITY, "city_too_long"),
  country: optionalCountrySchema,
};

/** @template {z.ZodObject<any>} T */
function withListingCoordinates(schema) {
  return schema.refine(invalidZeroCoordinatesRefine.refine, {
    message: invalidZeroCoordinatesRefine.message,
    path: invalidZeroCoordinatesRefine.path,
  });
}

/** Listing creation payload (server action). */
export const createListingSchema = z
  .object({
    type: z.enum(LISTING_TYPES),
    petType: z.enum(PET_TYPES),
    breed: optionalTrimmedMax(MAX_BREED, "breed_too_long"),
    color: requiredTrimmedMax(MAX_COLOR, "color_too_long"),
    description: optionalTrimmedMax(MAX_DESCRIPTION, "description_too_long"),
    images: z.array(imageRefSchema).min(MIN_LISTING_IMAGES).max(MAX_LISTING_IMAGES),
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
    address: optionalTrimmedMax(MAX_ADDRESS, "address_too_long"),
    city: optionalTrimmedMax(MAX_CITY, "city_too_long"),
    country: optionalCountrySchema,
    locationSource: z.enum(["manual", "exif"]).optional(),
    allowEmail: z.boolean().optional(),
    allowPhone: z.boolean().optional(),
    locale: localeSchema.optional().default("en"),
  })
  .refine(invalidZeroCoordinatesRefine.refine, {
    message: invalidZeroCoordinatesRefine.message,
    path: invalidZeroCoordinatesRefine.path,
  })
  .refine(({ allowEmail, allowPhone }) => allowEmail || allowPhone, {
    message: "contact_required",
    path: ["allowEmail"],
  });

/** Listing update payload — owner may edit details and location only. */
export const updateListingSchema = withListingCoordinates(
  z.object({
    color: requiredTrimmedMax(MAX_COLOR, "color_too_long"),
    breed: optionalTrimmedMax(MAX_BREED, "breed_too_long"),
    description: optionalTrimmedMax(MAX_DESCRIPTION, "description_too_long"),
    ...listingLocationFieldShape,
  }),
);

/** Digital Collar settings nested on owned pets. */
export const digitalCollarSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    allowEmail: z.boolean().optional().default(true),
    allowPhone: z.boolean().optional().default(false),
    medicalAlerts: z
      .string()
      .max(MAX_NOTE, "medical_alerts_too_long")
      .optional()
      .transform((value) => value?.trim() || ""),
  })
  .refine(({ enabled, allowEmail, allowPhone }) => !enabled || allowEmail || allowPhone, {
    message: "contact_required",
    path: ["allowEmail"],
  });

/** Owned-pet create/update payload (server action). */
export const ownedPetSchema = z.object({
  name: requiredTrimmedMax(MAX_NAME, "name_too_long"),
  microchipId: microchipSchema,
  petType: z.enum(PET_TYPES),
  breed: optionalTrimmedMax(MAX_BREED, "breed_too_long"),
  color: requiredTrimmedMax(MAX_COLOR, "color_too_long"),
  description: optionalTrimmedMax(MAX_DESCRIPTION, "description_too_long"),
  photo: imageRefSchema,
  photo2: imageRefSchema
    .optional()
    .nullable()
    .transform((value) => (value?.url ? value : undefined)),
  passportPhoto: imageRefSchema
    .optional()
    .nullable()
    .transform((value) => (value?.url ? value : undefined)),
  digitalCollar: digitalCollarSchema.optional(),
});

/** Admin listing edit — full field access including status. */
export const adminListingSchema = withListingCoordinates(
  z.object({
    type: z.enum(LISTING_TYPES),
    status: z.enum(LISTING_STATUSES),
    petType: z.enum(PET_TYPES),
    breed: optionalTrimmedMax(MAX_BREED, "breed_too_long"),
    color: requiredTrimmedMax(MAX_COLOR, "color_too_long"),
    description: optionalTrimmedMax(MAX_DESCRIPTION, "description_too_long"),
    ...listingLocationFieldShape,
  }),
);

/** Schema for usernames / handles (@username). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((val) => val.replace(/^@/, ""))
  .refine((val) => !val || new RegExp(`^[a-z0-9_]{3,${MAX_USERNAME}}$`).test(val), {
    message: "invalid_username",
  })
  .refine((val) => !val || !RESERVED_USERNAMES.includes(val), { message: "reserved_username" });

/** Admin user edit payload. */
export const adminUserSchema = z.object({
  name: requiredTrimmedMax(MAX_NAME, "name_too_long"),
  phone: optionalPhoneSchema.optional(),
  phoneVerified: z.boolean().optional(),
  country: optionalCountrySchema,
  city: z.string().trim().max(MAX_CITY).optional(),
  locale: localeSchema.optional(),
  role: z
    .string()
    .optional()
    .transform((val) => (val && USER_ROLES.includes(val) ? val : "user")),
  username: usernameSchema.optional().or(z.literal("")),
  status: z.enum(["active", "banned", "deactivated", "deleted"]).optional(),
  /** Optional note included in the manual ban email (admin edit form). */
  banReason: z.string().trim().max(MAX_NOTE).optional(),
});

/** Start phone OTP — E.164 required. */
export const startPhoneVerificationSchema = z.object({
  phone: optionalPhoneSchema,
}).refine((data) => Boolean(data.phone), { message: "invalid_phone", path: ["phone"] });

/** Confirm phone OTP. */
export const confirmPhoneVerificationSchema = z.object({
  phone: optionalPhoneSchema,
  code: z.string().trim().min(4).max(MAX_OTP_CODE),
}).refine((data) => Boolean(data.phone), { message: "invalid_phone", path: ["phone"] });

/** Admin complimentary Premium grant — years=0 means forever. */
export const adminGrantPremiumSchema = z.object({
  years: z.coerce.number().int().min(0).max(50),
});

/** Admin owned-pet edit payload. */
export const adminOwnedPetSchema = z.object({
  name: requiredTrimmedMax(MAX_NAME, "name_too_long"),
  microchipId: microchipSchema,
  petType: z.enum(PET_TYPES),
  breed: optionalTrimmedMax(MAX_BREED, "breed_too_long"),
  color: requiredTrimmedMax(MAX_COLOR, "color_too_long"),
  description: optionalTrimmedMax(MAX_DESCRIPTION, "description_too_long"),
  status: z.enum(OWNED_PET_STATUSES),
  adminNote: z
    .string()
    .max(MAX_ADMIN_NOTE, "admin_note_too_long")
    .optional()
    .transform((value) => value?.trim() || ""),
});

/** Profile update payload (server action). */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME).optional(),
  phone: optionalPhoneSchema.optional(),
  locale: localeSchema.optional(),
  country: optionalCountrySchema,
  city: z.string().trim().max(MAX_CITY).optional(),
  image: z.union([z.string().url(), z.literal("")]).optional(),
  username: usernameSchema.optional().or(z.literal("")),
});

/** Admin listing status change. */
export const adminListingStatusSchema = z.object({
  status: z.enum(LISTING_STATUSES),
});

/** Admin owned-pet status change. */
export const adminOwnedPetStatusSchema = z.object({
  status: z.enum(OWNED_PET_STATUSES),
});

/** Admin user role change. */
export const adminUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

/** Admin ban toggle with optional reason. */
export const adminBanUserSchema = z.object({
  reason: z
    .string()
    .max(MAX_NOTE, "ban_reason_too_long")
    .optional()
    .transform((value) => value?.trim() || undefined),
});

/** Admin owned-pet note update. */
export const adminOwnedPetNoteSchema = z.object({
  adminNote: z
    .string()
    .max(MAX_ADMIN_NOTE, "admin_note_too_long")
    .optional()
    .transform((value) => value?.trim() || ""),
});

/** Admin moderation case resolution. */
export const resolveReportCaseSchema = z.object({
  listingId: z.string().trim().min(1).max(80),
  reason: z.enum(REPORT_REASONS),
  action: z.enum(REPORT_CASE_ACTIONS),
  note: z
    .string()
    .max(MAX_NOTE, "note_too_long")
    .optional()
    .transform((value) => value?.trim() || ""),
});

/**
 * Format a stored E.164 phone number for display.
 * @param {string | null | undefined} phone
 * @returns {string}
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return "";
  const parsed = parsePhoneNumberFromString(phone);
  return parsed ? parsed.formatInternational() : phone;
}

/** Public contact form on the contact page. */
export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "name_too_short").max(MAX_NAME, "name_too_long"),
  topic: z.string().trim().min(2, "topic_too_short").max(MAX_CONTACT_TOPIC, "topic_too_long"),
  message: z.string().trim().min(10, "message_too_short").max(MAX_CONTACT_MESSAGE, "message_too_long"),
  token: z.string().min(1, "captcha_required"),
});

/** Turnstile-protected listing contact reveal. */
export const listingContactSchema = z.object({
  token: z.string().min(1, "captcha_required"),
});

/** Turnstile-protected Digital Collar contact reveal. */
export const tagContactSchema = z.object({
  token: z.string().min(1, "captcha_required"),
});

/** Turnstile-protected listing moderation report. */
export const listingReportSchema = z.object({
  token: z.string().min(1, "captcha_required"),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .max(MAX_REPORT_DETAILS, "details_too_long")
    .optional()
    .transform((value) => value?.trim() || ""),
});

/** User match status update (dismiss or confirm). */
export const updateMatchStatusSchema = z.object({
  matchId: z.string().min(1),
  status: z.enum(["confirmed", "dismissed"]),
});

const threshold = z.coerce.number().min(0).max(1);
const positiveInt = z.coerce.number().int().min(1);
const positiveKm = z.coerce.number().min(1).max(10_000);

/** Admin app settings form payload. */
export const appSettingsSchema = z.object({
  maxListingsPerDay: positiveInt.max(100),
  maxListingsPerMonth: positiveInt.max(500),
  maxOwnedPetsPerUser: positiveInt.max(50),
  maxReportsPerDay: positiveInt.max(500),
  listingExpiryDays: positiveInt.max(3650),
  listingExtensionEnabled: z.boolean(),
  listingExtensionDays: positiveInt.max(365),
  listingExtensionFromDay: positiveInt.max(365),
  reportAutoReviewWindowHours: positiveInt.max(8760),
  reportAutoReviewMinReports: positiveInt.max(100),
  confirmedViolationBanThreshold: positiveInt.max(100),
  imageMatchingEnabled: z.boolean(),
  matchSimilarityThreshold: threshold,
  matchConfidenceHighThreshold: threshold,
  geoMatchRadiusKm: positiveKm,
  dedupLookbackDays: positiveInt.max(3650),
  reverseSearchMaxListings: positiveInt.max(10_000),
  abuseReportThreshold: threshold,
  abuseReviewThreshold: threshold,
  abuseRemoveThreshold: threshold,
  matchBlockThreshold: threshold,
  corroborationThresholdMultiplier: z.coerce.number().min(1).max(3),
  sameUserRepostLookbackDays: positiveInt.max(3650),
  safetyEnabled: z.boolean(),
  safetyNsfwReviewThreshold: threshold,
  safetyNsfwBlockThreshold: threshold,
  safetyPetMinLikelihood: threshold,
  safetyMinImageWidth: positiveInt.max(10_000),
  safetyMinImageHeight: positiveInt.max(10_000),
  safetyMaxBlurScore: threshold,
  supportedPetTypes: z.array(z.enum(PET_TYPES)).min(1),
  socialLinks: z
    .array(
      z.object({
        platform: z
          .string()
          .min(1)
          .regex(/^[a-zA-Z0-9_-]+$/)
          .transform((value) => value.trim().toLowerCase()),
        url: z.string().trim().url({ message: "invalid_url" }),
      }),
    )
    .default([]),
  premiumEnabled: z.boolean(),
  premiumPriceCents: positiveInt.max(1_000_000),
  premiumCurrency: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3}$/),
  premiumMaxListingsPerDay: positiveInt.max(100),
  premiumMaxListingsPerMonth: positiveInt.max(500),
  stripePremiumProductId: z.string().trim().optional().default(""),
  stripePremiumPriceId: z.string().trim().optional().default(""),
});
