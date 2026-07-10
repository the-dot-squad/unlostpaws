/**
 * Admin list repository — search, filter, and paginated reads.
 *
 * Dashboard metrics: @/lib/repositories/admin-stats.
 */

import { getMongoDb } from "@/config/db";
import { getAuthUserId, normalizeAuthUser } from "@/lib/auth/users";
import { Listing, attachListingPublicId } from "@/models/listing";
import { OwnedPet } from "@/models/owned-pet";
import { ModerationReport } from "@/models/moderation-report";
import { getListingIdsWithOpenReports, getOpenReportStatsByListingIds } from "@/lib/moderation/report-cases";
import { ADMIN_PAGE_SIZE } from "@/config/constants/platform";

/** Escape special regex characters in user search input. */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a case-insensitive regex filter across multiple fields.
 * @param {string} q
 * @param {string[]} fields
 */
export function textSearchFilter(q, fields) {
  const trimmed = q?.trim();
  if (!trimmed) return null;
  const regex = new RegExp(escapeRegex(trimmed), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

/**
 * @param {Record<string, string | undefined>} sp
 */
export function buildListingFilter(sp) {
  const filter = {};

  if (sp.status) filter.status = sp.status;
  if (sp.type) filter.type = sp.type;
  if (sp.petType) filter.petType = sp.petType;
  if (sp.processingStatus) filter.processingStatus = sp.processingStatus;

  const search = textSearchFilter(sp.q, ["color", "breed", "description", "petType"]);
  if (search) {
    filter.$and = filter.$and || [];
    filter.$and.push(search);
  }

  return filter;
}

/**
 * @param {Record<string, string | undefined>} sp
 */
export function buildPetFilter(sp) {
  const filter = {};
  if (sp.status) filter.status = sp.status;
  if (sp.petType) filter.petType = sp.petType;

  const search = textSearchFilter(sp.q, ["name", "microchipId", "breed", "color"]);
  if (search) Object.assign(filter, search);

  return filter;
}

/**
 * @param {Record<string, string | undefined>} sp
 */
export function buildReportFilter(sp) {
  const filter = {};
  if (sp.status) filter.status = sp.status;
  if (sp.reason) filter.reason = sp.reason;
  if (sp.listingId) filter.listingId = sp.listingId;

  const search = textSearchFilter(sp.q, ["details", "reason"]);
  if (search) Object.assign(filter, search);

  return filter;
}


/**
 * @param {Record<string, string | undefined>} sp
 */
export function buildUserFilter(sp) {
  const filter = {};
  if (sp.role) filter.role = sp.role;
  if (sp.status) {
    if (sp.status === "active") {
      filter.status = { $in: ["active", null, undefined] };
    } else {
      filter.status = sp.status;
    }
  } else if (sp.banned === "yes") {
    filter.status = "banned";
  } else if (sp.banned === "no") {
    filter.status = { $nin: ["banned", "deactivated", "deleted"] };
  }

  const trimmed = sp.q?.trim();
  if (trimmed) {
    const regex = new RegExp(escapeRegex(trimmed), "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }, { publicId: regex }];
  }

  return filter;
}

/** Paginated listings with total count and live open-report stats. */
export async function queryListings(sp) {
  const filter = buildListingFilter(sp);

  if (sp.reported === "yes" || sp.reported === "no") {
    const openListingIds = await getListingIdsWithOpenReports();
    if (sp.reported === "yes") {
      filter._id = { $in: openListingIds.length ? openListingIds : [] };
    } else {
      filter._id = openListingIds.length ? { $nin: openListingIds } : filter._id;
    }
  }

  const [total, rows] = await Promise.all([
    Listing.countDocuments(filter),
    Listing.find(filter).sort({ createdAt: -1 }).limit(ADMIN_PAGE_SIZE).lean(),
  ]);

  const openStats = await getOpenReportStatsByListingIds(rows.map((l) => l._id));
  const items = rows.map((l) => {
    const stats = openStats[String(l._id)] ?? { openReportCount: 0, openCaseCount: 0 };
    return attachListingPublicId({ ...l, ...stats });
  });

  return { total, items, showing: items.length };
}

/** Paginated owned pets with owner lookup. */
export async function queryPets(sp) {
  const filter = buildPetFilter(sp);
  const [total, pets] = await Promise.all([
    OwnedPet.countDocuments(filter),
    OwnedPet.find(filter).sort({ createdAt: -1 }).limit(ADMIN_PAGE_SIZE).lean(),
  ]);

  const db = await getMongoDb();
  const userIds = [...new Set(pets.map((p) => p.userId))];
  const users = userIds.length
    ? await db
        .collection("user")
        .find({ $or: [{ _id: { $in: userIds } }, { id: { $in: userIds } }] })
        .project({ _id: 1, id: 1, publicId: 1, email: 1, name: 1 })
        .toArray()
    : [];

  const userMap = Object.fromEntries(
    users.map((u) => {
      const normalized = normalizeAuthUser(u);
      return [getAuthUserId(u), normalized];
    })
  );
  return { total, items: pets, userMap, showing: pets.length };
}

/** Paginated reports with populated listing. */
export async function queryReports(sp) {
  const filter = buildReportFilter(sp);
  const [total, items] = await Promise.all([
    ModerationReport.countDocuments(filter),
    ModerationReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(ADMIN_PAGE_SIZE)
      .populate("listingId")
      .lean(),
  ]);
  return { total, items, showing: items.length };
}


/** Paginated auth users. */
export async function queryUsers(sp) {
  const filter = buildUserFilter(sp);
  const db = await getMongoDb();
  const [total, rawItems] = await Promise.all([
    db.collection("user").countDocuments(filter),
    db.collection("user").find(filter).sort({ createdAt: -1 }).limit(ADMIN_PAGE_SIZE).toArray(),
  ]);
  const items = rawItems.map(normalizeAuthUser);
  return { total, items, showing: items.length };
}
