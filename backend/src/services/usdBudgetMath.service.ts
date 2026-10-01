import type { Executor } from "../db/client";
import { db } from "../db/client";
import { budgetRepository } from "../repositories/budget.repository";
import { jobRepository } from "../repositories/job.repository";
import { compareUsd, subtractUsd } from "../libs/utils/decimal";

export interface UsdBudgetSnapshot {
  monthlyCap: string;
  confirmedThisMonth: string;
  pendingUsd: string;
  availableUsd: string;
}

/**
 * Single source of truth for "how much USD PAYGO cash is left this month".
 * Mirrors `budgetMath.service.ts`'s role for the credits envelope.
 */
export async function computeUsdBudgetSnapshot(executor: Executor = db): Promise<UsdBudgetSnapshot> {
  const config = await budgetRepository.get();
  if (!config) {
    throw new Error("Budget config is missing; run `npm run db:seed` first");
  }

  const [confirmedThisMonth, pendingUsd] = await Promise.all([
    jobRepository.sumChargedUsdThisMonth(executor),
    jobRepository.sumOpenUsdReservations(executor),
  ]);

  const monthlyCap = config.usdMonthlyCap;
  const availableUsd = subtractUsd(subtractUsd(monthlyCap, confirmedThisMonth), pendingUsd);

  return { monthlyCap, confirmedThisMonth, pendingUsd, availableUsd };
}

/** The USD PAYGO cap is unset (0) — all USD kinds are unavailable per API_CONTRACT.md § R2 billing policy. */
export function isUsdCapUnset(monthlyCap: string): boolean {
  return compareUsd(monthlyCap, "0") <= 0;
}
