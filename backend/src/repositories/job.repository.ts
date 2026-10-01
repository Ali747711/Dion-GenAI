import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { jobs, type JobRow, type NewJobRow } from "../db/schema";
import { JOB_IN_FLIGHT_STATUSES, RESERVATION_OPEN_STATUSES } from "../libs/configs";
import type { Cursor } from "../libs/utils/pagination";

export const jobRepository = {
  async findByIdempotencyKey(idempotencyKey: string, executor: Executor = db): Promise<JobRow | null> {
    const rows = await executor.select().from(jobs).where(eq(jobs.idempotencyKey, idempotencyKey)).limit(1);
    return rows[0] ?? null;
  },

  async insert(row: NewJobRow, executor: Executor = db): Promise<JobRow> {
    const rows = await executor.insert(jobs).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create job");
    return created;
  },

  async findById(id: string, executor: Executor = db): Promise<JobRow | null> {
    const rows = await executor.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async update(id: string, patch: Partial<JobRow>, executor: Executor = db): Promise<JobRow | null> {
    const rows = await executor
      .update(jobs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async countInFlight(executor: Executor = db): Promise<number> {
    const rows = await executor
      .select({ id: jobs.id })
      .from(jobs)
      .where(inArray(jobs.status, [...JOB_IN_FLIGHT_STATUSES]));
    return rows.length;
  },

  /** R2: at most 1 in-flight job per billing group (`credits` | `usd`), not globally. */
  async countInFlightByGroup(billing: string, executor: Executor = db): Promise<number> {
    const rows = await executor
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.billing, billing), inArray(jobs.status, [...JOB_IN_FLIGHT_STATUSES])));
    return rows.length;
  },

  /** Sum of estimateUsd for USD-billed jobs whose reservation is still open. */
  async sumOpenUsdReservations(executor: Executor = db): Promise<string> {
    const rows = await executor
      .select({ total: sql<string>`COALESCE(SUM(${jobs.estimateUsd}), 0)::text` })
      .from(jobs)
      .where(and(eq(jobs.billing, "usd"), inArray(jobs.status, [...RESERVATION_OPEN_STATUSES])));
    return rows[0]?.total ?? "0";
  },

  /** Sum of chargedUsd for USD-billed jobs completed within the current calendar month. */
  async sumChargedUsdThisMonth(executor: Executor = db): Promise<string> {
    const result = await executor.execute(sql`
      SELECT COALESCE(SUM(charged_usd), 0)::text AS total
      FROM jobs
      WHERE billing = 'usd' AND charged_usd IS NOT NULL AND completed_at >= date_trunc('month', now())
    `);
    const rows = result as unknown as Array<{ total: string }>;
    return rows[0]?.total ?? "0";
  },

  /** Sum of estimateCredits for jobs whose reservation is still open. */
  async sumOpenReservations(executor: Executor = db): Promise<number> {
    const rows = await executor
      .select({ total: sql<number>`COALESCE(SUM(${jobs.estimateCredits}), 0)::int` })
      .from(jobs)
      .where(inArray(jobs.status, [...RESERVATION_OPEN_STATUSES]));
    return rows[0]?.total ?? 0;
  },

  async sumChargedCredits(executor: Executor = db): Promise<number> {
    const rows = await executor
      .select({ total: sql<number>`COALESCE(SUM(${jobs.chargedCredits}), 0)::int` })
      .from(jobs)
      .where(isNotNull(jobs.chargedCredits));
    return rows[0]?.total ?? 0;
  },

  async findMany(filter: { status?: string; kind?: string; cursor: Cursor | null; limit: number }): Promise<JobRow[]> {
    const conditions = [];
    if (filter.status) conditions.push(eq(jobs.status, filter.status));
    if (filter.kind) conditions.push(eq(jobs.kind, filter.kind));
    if (filter.cursor) {
      conditions.push(
        or(
          lt(jobs.createdAt, new Date(filter.cursor.createdAt)),
          and(eq(jobs.createdAt, new Date(filter.cursor.createdAt)), lt(jobs.id, filter.cursor.id))
        )
      );
    }
    return db
      .select()
      .from(jobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(jobs.createdAt), desc(jobs.id))
      .limit(filter.limit);
  },

  async sumsByEnvelope(executor: Executor = db): Promise<Record<string, { confirmed: number; pending: number }>> {
    const isOpenReservation = inArray(jobs.status, [...RESERVATION_OPEN_STATUSES]);
    const rows = await executor
      .select({
        envelope: jobs.envelope,
        confirmed: sql<number>`COALESCE(SUM(CASE WHEN ${jobs.chargedCredits} IS NOT NULL THEN ${jobs.chargedCredits} ELSE 0 END), 0)::int`,
        pending: sql<number>`COALESCE(SUM(CASE WHEN ${isOpenReservation} THEN ${jobs.estimateCredits} ELSE 0 END), 0)::int`,
      })
      .from(jobs)
      .groupBy(jobs.envelope);

    const map: Record<string, { confirmed: number; pending: number }> = {};
    for (const row of rows) map[row.envelope] = { confirmed: row.confirmed, pending: row.pending };
    return map;
  },

  /** USD-billed jobs that settled successfully but with an unverified/undocumented provider price (chargedUsd null). */
  async countUnknownPriceSettlements(executor: Executor = db): Promise<number> {
    const rows = await executor
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.billing, "usd"), eq(jobs.status, "succeeded"), isNull(jobs.chargedUsd)));
    return rows.length;
  },

  async countByStatuses(statuses: string[], executor: Executor = db): Promise<number> {
    const rows = await executor.select({ id: jobs.id }).from(jobs).where(inArray(jobs.status, statuses));
    return rows.length;
  },

  async byDayConfirmedCredits(sinceDays: number): Promise<{ date: string; credits: number }[]> {
    const result = await db.execute(sql`
      SELECT to_char(completed_at, 'YYYY-MM-DD') AS date, COALESCE(SUM(charged_credits), 0)::int AS credits
      FROM jobs
      WHERE charged_credits IS NOT NULL AND completed_at >= now() - (${sinceDays}::text || ' days')::interval
      GROUP BY 1
      ORDER BY 1
    `);
    return result as unknown as Array<{ date: string; credits: number }>;
  },
};
