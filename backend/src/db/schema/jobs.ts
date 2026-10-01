import { integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    input: jsonb("input").notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    envelope: text("envelope").notNull().default("music"),
    billing: text("billing").notNull().default("credits"), // credits | usd
    estimateCredits: integer("estimate_credits").notNull().default(0),
    chargedCredits: integer("charged_credits"),
    estimateUsd: numeric("estimate_usd", { precision: 12, scale: 6 }),
    chargedUsd: numeric("charged_usd", { precision: 12, scale: 6 }),
    result: jsonb("result"),
    pricingVersion: text("pricing_version").notNull(),
    providerTaskId: text("provider_task_id"),
    errorClass: text("error_class"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("jobs_idempotency_key_idx").on(table.idempotencyKey)]
);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
