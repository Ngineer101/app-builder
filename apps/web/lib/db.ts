import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

export function sqliteClient() {
  if (_sqlite) return _sqlite;

  const sqlitePath = process.env.DATABASE_PATH;
  if (!sqlitePath) {
    throw new Error("DATABASE_PATH is required");
  }

  _sqlite = new Database(sqlitePath);
  _sqlite.pragma("journal_mode = WAL");
  return _sqlite;
}

export function db() {
  if (_db) return _db;

  _db = drizzle(sqliteClient(), { schema });
  return _db;
}
