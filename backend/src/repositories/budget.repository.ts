import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { budgetConfig, type BudgetConfigRow } from "../db/schema";

const SINGLETON_ID = 1;

export const budgetRepository = {
  async get(): Promise<BudgetConfigRow | null> {
    const rows = await db.select().from(budgetConfig).where(eq(budgetConfig.id, SINGLETON_ID)).limit(1);
    return rows[0] ?? null;
  },

  async update(patch: Partial<Pick<BudgetConfigRow, "startingAllocation" | "reserveCredits" | "envelopes" | "usdMonthlyCap">>): Promise<BudgetConfigRow> {
    const rows = await db
      .update(budgetConfig)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(budgetConfig.id, SINGLETON_ID))
      .returning();
    const updated = rows[0];
    if (!updated) throw new Error("Budget config row is missing; run npm run db:seed");
    return updated;
  },
};
