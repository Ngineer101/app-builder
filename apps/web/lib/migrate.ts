import { sql } from "drizzle-orm";

import { db } from "./db";
import { getAuth } from "./auth";

let _ran: Promise<void> | null = null;

/**
 * POC migrations: run on demand, once per process.
 *
 * - Runs Better Auth migrations (creates required auth tables)
 * - Ensures app-builder tables exist
 */
export async function ensureMigrations() {
  if (_ran) return _ran;

  _ran = (async () => {
    // 1) better-auth tables
    const auth = getAuth();
    const ctx = await auth.$context;
    await ctx.runMigrations();

    // 2) app-builder tables
    // Keep SQL explicit (simplest POC) instead of a separate drizzle migration pipeline.
    await db().run(sql`
      CREATE TABLE IF NOT EXISTS app_builder_sandboxes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        kit_id TEXT NOT NULL,
        sandbox_id TEXT NOT NULL,
        preview_url TEXT,
        created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('now') * 1000 AS INTEGER)),
        last_active_at INTEGER NOT NULL DEFAULT (CAST(unixepoch('now') * 1000 AS INTEGER)),
        stopped_at INTEGER
      );
    `);

    await db().run(sql`
      CREATE INDEX IF NOT EXISTS app_builder_sandboxes_user_id_idx
      ON app_builder_sandboxes (user_id);
    `);

    await db().run(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS app_builder_sandboxes_sandbox_id_uidx
      ON app_builder_sandboxes (sandbox_id);
    `);
  })();

  return _ran;
}
