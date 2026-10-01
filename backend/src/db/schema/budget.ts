import { integer, jsonb, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";

/** Singleton row (id = 1) holding the owner's budget configuration. */
export const budgetConfig = pgTable("budget_config", {
  id: integer("id").primaryKey().default(1),
  startingAllocation: integer("starting_allocation").notNull(),
  reserveCredits: integer("reserve_credits").notNull(),
  envelopes: jsonb("envelopes").notNull(), // { key, label, allocated }[]
  maxConcurrentPaidJobs: integer("max_concurrent_paid_jobs").notNull().default(1),
  // R2: USD pay-as-you-go monthly cap, decimal string. "0.00" disables all USD kinds.
  usdMonthlyCap: numeric("usd_monthly_cap", { precision: 12, scale: 6 }).notNull().default("0.00"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BudgetConfigRow = typeof budgetConfig.$inferSelect;
export type NewBudgetConfigRow = typeof budgetConfig.$inferInsert;

export interface BudgetEnvelopeConfig {
  key: "music" | "supporting" | "validation";
  label: string;
  allocated: number;
}
