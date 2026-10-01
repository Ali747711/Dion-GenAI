import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { jobs } from "./jobs";

/**
 * Transactional outbox: inserted in the SAME transaction as the job
 * reservation, so an accepted job can never be lost between "reserved" and
 * "dispatched to the worker". The worker claims rows with
 * `FOR UPDATE SKIP LOCKED`.
 */
export const jobOutbox = pgTable("job_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  status: text("status").notNull().default("pending"), // pending | processing | done | dead | cancelled
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lockedBy: text("locked_by"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobOutboxRow = typeof jobOutbox.$inferSelect;
export type NewJobOutboxRow = typeof jobOutbox.$inferInsert;
