/** @file MongoDB connection cache. */

import mongoose from "mongoose";
import { env } from "@/config/env";

const cache = globalThis;

if (!cache._mongooseCache) {
  cache._mongooseCache = { conn: null, promise: null };
}

/** @returns {Promise<typeof mongoose>} */
export async function connectDB() {
  const cached = cache._mongooseCache;

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.db.url);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/** @returns {Promise<import("mongodb").Db>} */
export async function getMongoDb() {
  const conn = await connectDB();
  return conn.connection.db;
}
