import { boolean, doublePrecision, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull().default("audio"),
  source: text("source").notNull().default("music"),
  title: text("title").notNull(),
  jobId: uuid("job_id"),
  variantId: uuid("variant_id"),
  variantIndex: integer("variant_index"),
  siblingAssetId: uuid("sibling_asset_id"),
  projectId: uuid("project_id"),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(),
  durationSeconds: doublePrecision("duration_seconds"),
  favorite: boolean("favorite").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  lyrics: text("lyrics"),
  prompt: text("prompt"),
  tags: jsonb("tags").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;
