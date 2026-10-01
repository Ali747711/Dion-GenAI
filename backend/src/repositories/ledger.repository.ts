import { and, desc, eq, lt, or, sql } from "drizzle-orm";

import { db, type Executor } from "../db/client";
import { ledgerEntries, type LedgerEntryRow, type NewLedgerEntryRow } from "../db/schema";
import type { Cursor } from "../libs/utils/pagination";

export const ledgerRepository = {
  async insert(row: NewLedgerEntryRow, executor: Executor = db): Promise<LedgerEntryRow> {
    const rows = await executor.insert(ledgerEntries).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create ledger entry");
    return created;
  },

  /**
   * Insert a charge entry with a unique settlement key. Uses ON CONFLICT DO
   * NOTHING (not try/catch) so a duplicate settlement attempt never aborts
   * the surrounding transaction — it just returns null.
   */
  async insertSettlementCharge(row: NewLedgerEntryRow, executor: Executor = db): Promise<LedgerEntryRow | null> {
    const rows = await executor
      .insert(ledgerEntries)
      .values(row)
      .onConflictDoNothing({ target: ledgerEntries.settlementKey })
      .returning();
    return rows[0] ?? null;
  },

  async findMany(cursor: Cursor | null, limit: number): Promise<LedgerEntryRow[]> {
    const conditions = [];
    if (cursor) {
      conditions.push(
        or(
          lt(ledgerEntries.createdAt, new Date(cursor.createdAt)),
          and(eq(ledgerEntries.createdAt, new Date(cursor.createdAt)), lt(ledgerEntries.id, cursor.id))
        )
      );
    }
    return db
      .select()
      .from(ledgerEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntries.createdAt), desc(ledgerEntries.id))
      .limit(limit);
  },

  async sumByKind(kind: string): Promise<number> {
    const result = await db.execute(sql`SELECT COALESCE(SUM(credits), 0)::int AS total FROM ledger_entries WHERE kind = ${kind}`);
    const rows = result as unknown as Array<{ total: number }>;
    return rows[0]?.total ?? 0;
  },

  async lastReconciledAt(): Promise<Date | null> {
    const result = await db.execute(
      sql`SELECT created_at FROM ledger_entries WHERE source = 'reconciliation' ORDER BY created_at DESC LIMIT 1`
    );
    const rows = result as unknown as Array<{ created_at: Date }>;
    return rows[0]?.created_at ?? null;
  },
};
