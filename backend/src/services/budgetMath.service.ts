import type { Executor } from "../db/client";
import { db } from "../db/client";
import type { BudgetConfigRow } from "../db/schema";
import { budgetRepository } from "../repositories/budget.repository";
import { jobRepository } from "../repositories/job.repository";
import { ledgerRepository } from "../repositories/ledger.repository";
import { LedgerKind } from "../libs/enums/job.enum";

export interface BudgetSnapshot {
  config: BudgetConfigRow;
  adjustmentsCredits: number;
  confirmedCredits: number;
  pendingCredits: number;
  estimatedRemaining: number;
}

/**
 * Single source of truth for "how much is left to spend". Used by the
 * estimator, job reservation check, and the usage endpoint so all three
 * agree with each other.
 */
export async function computeBudgetSnapshot(executor: Executor = db): Promise<BudgetSnapshot> {
  const config = await budgetRepository.get();
  if (!config) {
    throw new Error("Budget config is missing; run `npm run db:seed` first");
  }

  const [confirmedCredits, pendingCredits, adjustmentsCredits] = await Promise.all([
    jobRepository.sumChargedCredits(executor),
    jobRepository.sumOpenReservations(executor),
    ledgerRepository.sumByKind(LedgerKind.ADJUSTMENT),
  ]);

  const estimatedRemaining = config.startingAllocation + adjustmentsCredits - config.reserveCredits - confirmedCredits - pendingCredits;

  return { config, adjustmentsCredits, confirmedCredits, pendingCredits, estimatedRemaining };
}
