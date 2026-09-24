/** @file Shared max lengths for form inputs and Zod schemas — keep FE and BE in sync. */

/** Display name (profile, contact) and pet name. */
export const MAX_NAME = 100;

/** City / locality. */
export const MAX_CITY = 100;

/** Street / freeform address line. */
export const MAX_ADDRESS = 200;

/** Pet color (suggest + custom). */
export const MAX_COLOR = 50;

/** Pet breed (suggest + custom). */
export const MAX_BREED = 80;

/** Listing / owned-pet description. */
export const MAX_DESCRIPTION = 2000;

/** Digital collar medical alerts, ban reason, report-case note. */
export const MAX_NOTE = 500;

/** Staff admin note on owned pets. */
export const MAX_ADMIN_NOTE = 2000;

/** Flyer print headline. */
export const MAX_FLYER_HEADLINE = 80;

/** Flyer print notes. */
export const MAX_FLYER_NOTES = 500;

/** Username / handle. */
export const MAX_USERNAME = 30;

/** Phone OTP code. */
export const MAX_OTP_CODE = 12;

/** ISO 3166-1 alpha-2 country code. */
export const MAX_COUNTRY = 2;

/**
 * Microchip input before strip (15 digits + optional dashes/spaces).
 * Server still requires exactly 15 digits after normalization.
 */
export const MAX_MICROCHIP_INPUT = 19;

/** Contact form topic. */
export const MAX_CONTACT_TOPIC = 120;

/** Contact form message. */
export const MAX_CONTACT_MESSAGE = 5000;

/** Listing moderation report details. */
export const MAX_REPORT_DETAILS = 2000;
