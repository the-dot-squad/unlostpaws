/** @file better-auth server configuration — use {@link ./session} for request guards. */

import { getMongoDb } from "@/config/db";
import { createAuthInstance } from "./create-auth-instance";

let authInstance = null;

export async function getAuth() {
  if (authInstance) return authInstance;

  const db = await getMongoDb();
  authInstance = createAuthInstance(db);
  return authInstance;
}
