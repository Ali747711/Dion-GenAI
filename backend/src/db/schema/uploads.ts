import { doublePrecision, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Owner-scoped upload staging area (R2). Bytes live in storage/ under a
 * random key; a job that references `uploadId` re-sends those bytes to the
 * provider (Noiz has no "reuse a previous upload" mechanism). Unconsumed
 * uploads expire after 24h; a worker cleanup routine deletes them.
 */
export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  purpose: text("purpose").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storageKey: text("storage_key").notNull(),
  bytes: integer("bytes").notNull(),
  durationSeconds: doublePrecision("duration_seconds"),
  status: text("status").notNull().default("ready"),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UploadRow = typeof uploads.$inferSelect;
export type NewUploadRow = typeof uploads.$inferInsert;
