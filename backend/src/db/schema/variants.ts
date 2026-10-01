import { doublePrecision, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { jobs } from "./jobs";

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    index: integer("index").notNull(),
    providerProductId: text("provider_product_id"),
    status: text("status").notNull().default("pending"),
    rawStatus: text("raw_status"),
    durationSeconds: doublePrecision("duration_seconds"),
    progress: doublePrecision("progress"),
    assetId: uuid("asset_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("variants_job_index_idx").on(table.jobId, table.index),
    uniqueIndex("variants_provider_product_id_idx").on(table.providerProductId),
  ]
);

export type VariantRow = typeof variants.$inferSelect;
export type NewVariantRow = typeof variants.$inferInsert;
