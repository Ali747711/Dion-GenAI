import { asc, eq } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { variants, type NewVariantRow, type VariantRow } from "../db/schema";

export const variantRepository = {
  async insertMany(rows: NewVariantRow[], executor: Executor = db): Promise<VariantRow[]> {
    return executor.insert(variants).values(rows).returning();
  },

  async findByJobId(jobId: string, executor: Executor = db): Promise<VariantRow[]> {
    return executor.select().from(variants).where(eq(variants.jobId, jobId)).orderBy(asc(variants.index));
  },

  async findById(id: string, executor: Executor = db): Promise<VariantRow | null> {
    const rows = await executor.select().from(variants).where(eq(variants.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async update(id: string, patch: Partial<VariantRow>, executor: Executor = db): Promise<VariantRow | null> {
    const rows = await executor
      .update(variants)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(variants.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
