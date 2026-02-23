import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  // Disable prefetch in serverless environments
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}
