import { and, eq, isNull, lt } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { uploads, type NewUploadRow, type UploadRow } from "../db/schema";

export const uploadRepository = {
  async insert(row: NewUploadRow, executor: Executor = db): Promise<UploadRow> {
    const rows = await executor.insert(uploads).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create upload");
    return created;
  },

  async findById(id: string, executor: Executor = db): Promise<UploadRow | null> {
    const rows = await executor.select().from(uploads).where(eq(uploads.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async markConsumed(id: string, executor: Executor = db): Promise<void> {
    await executor.update(uploads).set({ consumedAt: new Date(), status: "consumed" }).where(eq(uploads.id, id));
  },

  /** Uploads never referenced by a job, past their expiry — candidates for the worker's cleanup routine. */
  async findExpiredUnconsumed(now: Date, executor: Executor = db): Promise<UploadRow[]> {
    return executor
      .select()
      .from(uploads)
      .where(and(isNull(uploads.consumedAt), lt(uploads.expiresAt, now)));
  },

  async delete(id: string, executor: Executor = db): Promise<void> {
    await executor.delete(uploads).where(eq(uploads.id, id));
  },
};
