import { integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id"),
    kind: text("kind").notNull(), // allocation | reservation | reservation_release | charge | adjustment
    credits: integer("credits").notNull(), // signed
    usdEstimate: numeric("usd_estimate", { precision: 14, scale: 6 }),
    currency: text("currency").notNull().default("credits"), // credits | usd
    source: text("source").notNull(), // owner | app | provider | reconciliation
    pricingVersion: text("pricing_version"),
    note: text("note"),
    // Unique per settled job to guarantee exactly-once settlement. NULL for
    // non-charge entries (Postgres unique indexes treat NULLs as distinct).
    settlementKey: text("settlement_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ledger_settlement_key_idx").on(table.settlementKey)]
);

export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntryRow = typeof ledgerEntries.$inferInsert;
