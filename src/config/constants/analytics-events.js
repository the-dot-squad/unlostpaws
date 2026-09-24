/** @file GTM dataLayer event names — no PII in param keys. Safe for client and server. */

export const ANALYTICS_EVENTS = {
  LISTING_CONTACT_REVEAL: "listing_contact_reveal",
  TAG_CONTACT_REVEAL: "tag_contact_reveal",
  CONTACT_FORM_SUBMIT: "contact_form_submit",
  LISTING_REPORT_SUBMIT: "listing_report_submit",
  LISTING_SEARCH: "listing_search",
  MAP_FILTER: "map_filter",
  MAP_LISTING_CLICK: "map_listing_click",
  LISTING_CREATE: "listing_create",
  PET_CREATE: "pet_create",
  SIGN_IN_CLICK: "sign_in_click",
  LOGIN: "login",
  SIGN_UP: "sign_up",
  AGE_CONFIRM: "age_confirm",
  BEGIN_CHECKOUT: "begin_checkout",
  PURCHASE: "purchase",
};

/** sessionStorage key set on OAuth button click; consumed by AuthAnalyticsBeacon. */
export const AUTH_INTENT_STORAGE_KEY = "ulp_auth_intent";

/** sessionStorage key to avoid double-firing age_confirm. */
export const AGE_CONFIRM_FIRED_KEY = "ulp_age_confirm_fired";

/** sessionStorage key to avoid double-firing purchase after Stripe return. */
export const PURCHASE_FIRED_KEY = "ulp_purchase_fired";
