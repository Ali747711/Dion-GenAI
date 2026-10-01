import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Local voice reference (R2). Built-in voices get stable local rows synced
 * from the provider (cached <=24h); custom/designed voices are created by
 * voice_clone / voice_design jobs.
 */
export const voices = pgTable(
  "voices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerVoiceId: text("provider_voice_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(), // built-in | custom | designed
    labels: text("labels"),
    language: text("language"),
    previewStorageKey: text("preview_storage_key"),
    previewMimeType: text("preview_mime_type"),
    permissionConfirmedAt: timestamp("permission_confirmed_at", { withTimezone: true }),
    deletionStatus: text("deletion_status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("voices_provider_voice_id_idx").on(table.providerVoiceId)]
);

export type VoiceRow = typeof voices.$inferSelect;
export type NewVoiceRow = typeof voices.$inferInsert;
