/** @file Zod schemas and helpers for API routes and server actions. */

import { z } from "zod";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";
import {
  LISTING_TYPES,
  MAX_LISTING_IMAGES,
  MIN_LISTING_IMAGES,
  PET_TYPES,
  REPORT_REASONS,
} from "@/config/constants/enums";
import { FEED_FORMATS } from "@/config/constants/feeds";
import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/storage/images";

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
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
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
    breed: z.string().optional(),
    color: z.string().min(1),
    description: z.string().optional(),
    images: z.array(imageRefSchema).min(MIN_LISTING_IMAGES).max(MAX_LISTING_IMAGES),
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    locationSource: z.enum(["manual", "exif"]).optional(),
    allowEmail: z.boolean().optional(),
    allowPhone: z.boolean().optional(),
    locale: z.enum(["en", "fa"]).optional().default("en"),
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
    color: z.string().min(1),
    breed: z.string().optional(),
    description: z.string().optional(),
    ...listingLocationFieldShape,
  }),
);

/** Owned-pet create/update payload (server action). */
export const ownedPetSchema = z.object({
  name: z.string().min(1),
  microchipId: microchipSchema,
  petType: z.enum(PET_TYPES),
  breed: z.string().optional(),
  color: z.string().min(1),
  description: z.string().optional(),
  photo: imageRefSchema,
  photo2: imageRefSchema
    .optional()
    .nullable()
    .transform((value) => (value?.url ? value : undefined)),
  passportPhoto: imageRefSchema
    .optional()
    .nullable()
    .transform((value) => (value?.url ? value : undefined)),
});

/** Admin listing edit — full field access including status. */
export const adminListingSchema = withListingCoordinates(
  z.object({
    type: z.enum(LISTING_TYPES),
    status: z.enum(["active", "resolved", "expired", "removed", "under_review"]),
    petType: z.enum(PET_TYPES),
    breed: z.string().optional(),
    color: z.string().min(1),
    description: z.string().optional(),
    ...listingLocationFieldShape,
  }),
);

/** Admin user edit payload. */
export const adminUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: optionalPhoneSchema.optional(),
  country: z
    .string()
    .optional()
    .transform((value) => value?.trim().toUpperCase() || "")
    .refine((value) => !value || value.length === 2, { message: "invalid_country" }),
  city: z.string().trim().max(100).optional(),
  locale: z.string().min(2).optional(),
  role: z.enum(["user", "moderator", "admin"]),
  banned: z.boolean().optional(),
});

/** Admin owned-pet edit payload. */
export const adminOwnedPetSchema = z.object({
  name: z.string().min(1),
  microchipId: microchipSchema,
  petType: z.enum(PET_TYPES),
  breed: z.string().optional(),
  color: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "archived", "removed"]),
  adminNote: z.string().optional(),
});

/** Profile update payload (server action). */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: optionalPhoneSchema.optional(),
  locale: z.string().min(2).optional(),
  country: z
    .string()
    .optional()
    .transform((value) => value?.trim().toUpperCase() || "")
    .refine((value) => !value || value.length === 2, { message: "invalid_country" }),
  city: z.string().trim().max(100).optional(),
  image: z.union([z.string().url(), z.literal("")]).optional(),
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
  name: z.string().trim().min(2, "name_too_short").max(100, "name_too_long"),
  topic: z.string().trim().min(2, "topic_too_short").max(120, "topic_too_long"),
  message: z.string().trim().min(10, "message_too_short").max(5000, "message_too_long"),
  token: z.string().min(1, "captcha_required"),
});

/** Turnstile-protected listing contact reveal. */
export const listingContactSchema = z.object({
  token: z.string().min(1, "captcha_required"),
});

/** Turnstile-protected listing moderation report. */
export const listingReportSchema = z.object({
  token: z.string().min(1, "captcha_required"),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .max(2000, "details_too_long")
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
});
