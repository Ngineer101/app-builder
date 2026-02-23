import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

// better-auth tables are generated via @better-auth/cli.
// This schema file includes only app-builder-specific tables.

export const sandboxes = pgTable("app_builder_sandboxes", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  kitId: varchar("kit_id", { length: 64 }).notNull(),
  sandboxId: text("sandbox_id").notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
});
