import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";

// better-auth tables are generated via @better-auth/cli.
// This schema file includes only app-builder-specific tables.

export const sandboxes = sqliteTable("app_builder_sandboxes", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  kitId: text("kit_id").notNull(),
  sandboxId: text("sandbox_id").notNull(),
  previewUrl: text("preview_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  stoppedAt: integer("stopped_at", { mode: "timestamp_ms" }),
});
