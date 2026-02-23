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
    await db().execute(sql`
      CREATE TABLE IF NOT EXISTS app_builder_sandboxes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        kit_id VARCHAR(64) NOT NULL,
        sandbox_id TEXT NOT NULL,
        preview_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        stopped_at TIMESTAMPTZ
      );
    `);

    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS app_builder_sandboxes_user_id_idx
      ON app_builder_sandboxes (user_id);
    `);

    await db().execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS app_builder_sandboxes_sandbox_id_uidx
      ON app_builder_sandboxes (sandbox_id);
    `);
  })();

  return _ran;
}
