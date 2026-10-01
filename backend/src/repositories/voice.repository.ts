import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { voices, type NewVoiceRow, type VoiceRow } from "../db/schema";

export const voiceRepository = {
  async insert(row: NewVoiceRow, executor: Executor = db): Promise<VoiceRow> {
    const rows = await executor.insert(voices).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create voice");
    return created;
  },

  async findById(id: string, executor: Executor = db): Promise<VoiceRow | null> {
    const rows = await executor.select().from(voices).where(eq(voices.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByProviderVoiceId(providerVoiceId: string, executor: Executor = db): Promise<VoiceRow | null> {
    const rows = await executor.select().from(voices).where(eq(voices.providerVoiceId, providerVoiceId)).limit(1);
    return rows[0] ?? null;
  },

  async findMany(filter: { type?: string; q?: string }, executor: Executor = db): Promise<VoiceRow[]> {
    const conditions = [];
    if (filter.type) conditions.push(eq(voices.type, filter.type));
    if (filter.q) conditions.push(or(ilike(voices.name, `%${filter.q}%`), ilike(voices.labels, `%${filter.q}%`)));
    return executor
      .select()
      .from(voices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(voices.name));
  },

  async countBuiltIn(executor: Executor = db): Promise<number> {
    const rows = await executor.select({ id: voices.id }).from(voices).where(eq(voices.type, "built-in"));
    return rows.length;
  },

  async newestBuiltInSyncAt(executor: Executor = db): Promise<Date | null> {
    const rows = await executor.select({ updatedAt: voices.updatedAt }).from(voices).where(eq(voices.type, "built-in"));
    if (rows.length === 0) return null;
    return rows.reduce<Date | null>((latest, row) => (latest && latest > row.updatedAt ? latest : row.updatedAt), null);
  },

  /** Insert-or-update a built-in voice by its stable providerVoiceId (used by the 24h sync routine). */
  async upsertBuiltIn(row: NewVoiceRow, executor: Executor = db): Promise<VoiceRow> {
    const existing = await this.findByProviderVoiceId(row.providerVoiceId, executor);
    if (existing) {
      const rows = await executor
        .update(voices)
        .set({ name: row.name, labels: row.labels, language: row.language, updatedAt: new Date() })
        .where(eq(voices.id, existing.id))
        .returning();
      const updated = rows[0];
      if (!updated) throw new Error("Failed to update built-in voice");
      return updated;
    }
    return this.insert(row, executor);
  },

  async update(id: string, patch: Partial<VoiceRow>, executor: Executor = db): Promise<VoiceRow | null> {
    const rows = await executor
      .update(voices)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(voices.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async delete(id: string, executor: Executor = db): Promise<void> {
    await executor.delete(voices).where(eq(voices.id, id));
  },
};
