/** @file Typed blocklist — refuse re-registration by email or OAuth identity. */

import { getMongoDb } from "@/config/db";

/** @typedef {"under13" | "abuse" | "manual"} BlocklistType */

export const BLOCKLIST_TYPES = /** @type {const} */ (["under13", "abuse", "manual"]);

const COLLECTION = "blocklist";

let indexesEnsured = false;

/** @param {string | null | undefined} email */
export function normalizeBlocklistEmail(email) {
  if (!email || typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

/**
 * @param {{ providerId?: string; accountId?: string }[]} identities
 * @returns {{ providerId: string; accountId: string }[]}
 */
export function normalizeBlocklistIdentities(identities) {
  if (!Array.isArray(identities)) return [];
  const seen = new Set();
  const out = [];
  for (const item of identities) {
    const providerId = String(item?.providerId || "").trim();
    const accountId = String(item?.accountId || "").trim();
    if (!providerId || !accountId) continue;
    const key = `${providerId}:${accountId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ providerId, accountId });
  }
  return out;
}

/** @param {{ providerId: string; accountId: string }[]} identities */
function toIdentityKeys(identities) {
  return identities.map((i) => `${i.providerId}:${i.accountId}`);
}

/** @param {import("mongodb").Db} db */
async function ensureBlocklistIndexes(db) {
  if (indexesEnsured) return;
  const col = db.collection(COLLECTION);
  await Promise.all([
    col.createIndex(
      { type: 1, email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: "string" } } },
    ),
    col.createIndex(
      { type: 1, identityKeys: 1 },
      { unique: true, partialFilterExpression: { identityKeys: { $type: "string" } } },
    ),
  ]);
  indexesEnsured = true;
}

/**
 * @param {{ email?: string | null; identities?: { providerId: string; accountId: string }[] }} params
 * @returns {Promise<object | null>}
 */
export async function findBlocklistMatch({ email, identities } = {}) {
  const normalizedEmail = normalizeBlocklistEmail(email);
  const normalizedIdentities = normalizeBlocklistIdentities(identities || []);
  const identityKeys = toIdentityKeys(normalizedIdentities);

  if (!normalizedEmail && identityKeys.length === 0) return null;

  const db = await getMongoDb();
  await ensureBlocklistIndexes(db);

  /** @type {object[]} */
  const clauses = [];
  if (normalizedEmail) {
    clauses.push({ email: normalizedEmail });
  }
  if (identityKeys.length > 0) {
    clauses.push({ identityKeys: { $in: identityKeys } });
  }

  return db.collection(COLLECTION).findOne({ $or: clauses });
}

/**
 * @param {{ email?: string | null; identities?: { providerId: string; accountId: string }[] }} params
 */
export async function isBlocked(params) {
  const match = await findBlocklistMatch(params);
  return Boolean(match);
}

/**
 * Upsert a typed blocklist entry. Merges identities into an existing match for the same type.
 *
 * @param {{
 *   type: BlocklistType;
 *   email?: string | null;
 *   identities?: { providerId: string; accountId: string }[];
 *   reason?: string;
 *   createdBy?: string;
 *   metadata?: Record<string, unknown>;
 * }} params
 */
export async function addToBlocklist({
  type,
  email,
  identities = [],
  reason = "",
  createdBy = "system",
  metadata = {},
}) {
  if (!BLOCKLIST_TYPES.includes(type)) {
    throw new Error(`Invalid blocklist type: ${type}`);
  }

  const normalizedEmail = normalizeBlocklistEmail(email);
  const normalizedIdentities = normalizeBlocklistIdentities(identities);

  if (!normalizedEmail && normalizedIdentities.length === 0) {
    throw new Error("Blocklist entry requires email or OAuth identity");
  }

  const db = await getMongoDb();
  await ensureBlocklistIndexes(db);
  const col = db.collection(COLLECTION);
  const now = new Date();

  const existing =
    (normalizedEmail && (await col.findOne({ type, email: normalizedEmail }))) ||
    (await findBlocklistMatch({ email: normalizedEmail, identities: normalizedIdentities }));

  if (existing && existing.type === type) {
    const merged = normalizeBlocklistIdentities([
      ...(existing.identities || []),
      ...normalizedIdentities,
    ]);
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          email: existing.email || normalizedEmail,
          identities: merged,
          identityKeys: toIdentityKeys(merged),
          reason: reason || existing.reason || "",
          metadata: { ...(existing.metadata || {}), ...metadata },
          updatedAt: now,
        },
      },
    );
    return col.findOne({ _id: existing._id });
  }

  const doc = {
    type,
    email: normalizedEmail,
    identities: normalizedIdentities,
    identityKeys: toIdentityKeys(normalizedIdentities),
    reason: reason || "",
    createdBy,
    metadata,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      const match = await findBlocklistMatch({
        email: normalizedEmail,
        identities: normalizedIdentities,
      });
      if (match) {
        const merged = normalizeBlocklistIdentities([
          ...(match.identities || []),
          ...normalizedIdentities,
        ]);
        await col.updateOne(
          { _id: match._id },
          {
            $set: {
              email: match.email || normalizedEmail,
              identities: merged,
              identityKeys: toIdentityKeys(merged),
              reason: reason || match.reason || "",
              metadata: { ...(match.metadata || {}), ...metadata },
              updatedAt: now,
            },
          },
        );
        return col.findOne({ _id: match._id });
      }
    }
    throw err;
  }
}
