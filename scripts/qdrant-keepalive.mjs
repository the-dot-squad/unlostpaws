/**
 * Ping Qdrant Cloud with a tiny write/read/delete cycle so the free cluster
 * stays active. Leaves no leftover points.
 *
 * Usage: npm run qdrant:keepalive
 */

import { randomUUID } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL?.trim();
const QDRANT_API_KEY = process.env.QDRANT_API_KEY?.trim() || undefined;
const VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE || 768);
const COLLECTION = "keepalive";
const POINT_COUNT = 2;

function unitVector(seed) {
  const vector = Array.from({ length: VECTOR_SIZE }, (_, i) =>
    Math.sin(seed * 17.3 + i * 0.31)
  );
  const norm = Math.hypot(...vector) || 1;
  return vector.map((v) => v / norm);
}

async function ensureCollection(client) {
  const { collections } = await client.getCollections();
  if (collections.some((c) => c.name === COLLECTION)) {
    return;
  }

  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });
  console.log(`Created collection "${COLLECTION}"`);
}

async function main() {
  if (!QDRANT_URL) {
    throw new Error("QDRANT_URL is required");
  }

  const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

  console.log("Qdrant keepalive starting…");
  console.log(`URL: ${QDRANT_URL.replace(/^(https?:\/\/[^/]+).*/, "$1")}`);

  const { collections } = await client.getCollections();
  console.log(
    `Collections: ${collections.map((c) => c.name).join(", ") || "(none)"}`
  );

  await ensureCollection(client);

  const ids = Array.from({ length: POINT_COUNT }, () => randomUUID());
  const points = ids.map((id, i) => ({
    id,
    vector: unitVector(i + 1),
    payload: {
      purpose: "keepalive",
      at: new Date().toISOString(),
    },
  }));

  await client.upsert(COLLECTION, { wait: true, points });
  console.log(`Upserted ${points.length} probe point(s)`);

  const hits = await client.search(COLLECTION, {
    vector: points[0].vector,
    limit: POINT_COUNT,
    with_payload: true,
  });
  console.log(`Search returned ${hits.length} hit(s)`);

  await client.delete(COLLECTION, {
    wait: true,
    points: ids,
  });
  console.log(`Deleted ${ids.length} probe point(s)`);

  const info = await client.getCollection(COLLECTION);
  console.log(
    `Done — "${COLLECTION}" points_count=${info.points_count}, status=${info.status}`
  );
}

main().catch((err) => {
  console.error("Qdrant keepalive failed:", err?.message || err);
  process.exit(1);
});
