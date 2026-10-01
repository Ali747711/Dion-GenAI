import { eq, sql } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { jobOutbox, type JobOutboxRow } from "../db/schema";
import { OutboxStatus } from "../libs/enums/job.enum";

export const outboxRepository = {
  async insert(jobId: string, executor: Executor = db): Promise<JobOutboxRow> {
    const rows = await executor.insert(jobOutbox).values({ jobId }).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create outbox row");
    return created;
  },

  /**
   * Atomically claim the next due row: either a fresh `pending` row whose
   * `next_attempt_at` has passed, or a `processing` row whose lease expired
   * (a crashed worker). Single UPDATE ... WHERE id = (SELECT ... FOR UPDATE
   * SKIP LOCKED) statement, so it is safe across concurrent worker processes.
   */
  async claimNext(workerId: string, leaseMs: number): Promise<JobOutboxRow | null> {
    const result = await db.execute(sql`
      UPDATE job_outbox
      SET status = ${OutboxStatus.PROCESSING},
          locked_by = ${workerId},
          lease_expires_at = now() + (${leaseMs}::text || ' milliseconds')::interval,
          heartbeat_at = now(),
          updated_at = now()
      WHERE id = (
        SELECT id FROM job_outbox
        WHERE (status = ${OutboxStatus.PENDING} AND next_attempt_at <= now())
           OR (status = ${OutboxStatus.PROCESSING} AND lease_expires_at < now())
        ORDER BY next_attempt_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `);
    const rows = result as unknown as JobOutboxRowRaw[];
    const row = rows[0];
    return row ? mapRow(row) : null;
  },

  async heartbeat(id: string, leaseMs: number): Promise<void> {
    await db.execute(sql`
      UPDATE job_outbox
      SET heartbeat_at = now(), lease_expires_at = now() + (${leaseMs}::text || ' milliseconds')::interval, updated_at = now()
      WHERE id = ${id}
    `);
  },

  async markDone(id: string): Promise<void> {
    await db.update(jobOutbox).set({ status: OutboxStatus.DONE, updatedAt: new Date() }).where(eq(jobOutbox.id, id));
  },

  async markCancelledForJob(jobId: string): Promise<void> {
    await db
      .update(jobOutbox)
      .set({ status: OutboxStatus.CANCELLED, updatedAt: new Date() })
      .where(eq(jobOutbox.jobId, jobId));
  },

  async reschedule(id: string, nextAttemptAt: Date, attempts: number, lastError: string | null): Promise<void> {
    await db
      .update(jobOutbox)
      .set({
        status: OutboxStatus.PENDING,
        nextAttemptAt,
        attempts,
        lastError,
        lockedBy: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(jobOutbox.id, id));
  },

  async markDead(id: string, lastError: string): Promise<void> {
    await db
      .update(jobOutbox)
      .set({ status: OutboxStatus.DEAD, lastError, updatedAt: new Date() })
      .where(eq(jobOutbox.id, id));
  },
};

interface JobOutboxRowRaw {
  id: string;
  job_id: string;
  status: string;
  attempts: number;
  next_attempt_at: Date;
  locked_by: string | null;
  lease_expires_at: Date | null;
  heartbeat_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: JobOutboxRowRaw): JobOutboxRow {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lockedBy: row.locked_by,
    leaseExpiresAt: row.lease_expires_at,
    heartbeatAt: row.heartbeat_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
