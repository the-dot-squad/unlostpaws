/** @file better-auth server singleton — use {@link ./instance} for configuration. */

import { getMongoDb } from "@/config/db";
import { createAuthInstance } from "./instance";

let authInstance = null;

export async function getAuth() {
  if (authInstance) return authInstance;

  const db = await getMongoDb();
  authInstance = createAuthInstance(db);
  return authInstance;
}
