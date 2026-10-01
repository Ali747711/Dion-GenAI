import { LOW_BUDGET_WARNING_THRESHOLD, STALE_RECONCILIATION_DAYS } from "../libs/configs";
import type { BudgetEnvelopeConfig } from "../db/schema/budget";
import { JobStatus, LedgerCurrency, LedgerKind, LedgerSource } from "../libs/enums/job.enum";
import type { CreateReconciliationInput, LedgerEntry } from "../libs/types/ledger";
import type { BudgetSettings, BudgetUpdateInput, Usage, UsageEnvelope, UsageWarning } from "../libs/types/usage";
import { clampLimit, decodeCursor, encodeCursor } from "../libs/utils/pagination";
import { budgetRepository } from "../repositories/budget.repository";
import { jobRepository } from "../repositories/job.repository";
import { ledgerRepository } from "../repositories/ledger.repository";
import { computeBudgetSnapshot } from "./budgetMath.service";
import { computeUsdBudgetSnapshot, isUsdCapUnset } from "./usdBudgetMath.service";

function toApiLedgerEntry(row: Awaited<ReturnType<typeof ledgerRepository.findMany>>[number]): LedgerEntry {
  return {
    id: row.id,
    jobId: row.jobId,
    kind: row.kind as LedgerKind,
    credits: row.credits,
    usdEstimate: row.usdEstimate,
    currency: row.currency as LedgerCurrency,
    source: row.source as LedgerSource,
    pricingVersion: row.pricingVersion,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export const usageService = {
  async getUsage(): Promise<Usage> {
    const snapshot = await computeBudgetSnapshot();
    const usdSnapshot = await computeUsdBudgetSnapshot();
    const envelopeSums = await jobRepository.sumsByEnvelope();
    const lastReconciledAt = await ledgerRepository.lastReconciledAt();
    const byDay = await jobRepository.byDayConfirmedCredits(30);
    const pendingReconciliationCount = await jobRepository.countByStatuses([JobStatus.SUBMISSION_UNKNOWN, JobStatus.RECONCILIATION_REQUIRED]);
    const unknownPriceSettlements = await jobRepository.countUnknownPriceSettlements();

    const envelopeConfigs = snapshot.config.envelopes as BudgetEnvelopeConfig[];
    const envelopes: UsageEnvelope[] = envelopeConfigs.map((envelope) => ({
      key: envelope.key,
      label: envelope.label,
      allocated: envelope.allocated,
      confirmedCredits: envelopeSums[envelope.key]?.confirmed ?? 0,
      pendingCredits: envelopeSums[envelope.key]?.pending ?? 0,
    }));

    const warnings: UsageWarning[] = [];
    if (snapshot.estimatedRemaining < LOW_BUDGET_WARNING_THRESHOLD) warnings.push("low_budget");
    // Noiz account entitlement/pricing has never been independently verified (PRD section 11).
    warnings.push("unverified_pricing");
    const staleCutoffMs = Date.now() - STALE_RECONCILIATION_DAYS * 24 * 60 * 60 * 1000;
    if (!lastReconciledAt || lastReconciledAt.getTime() < staleCutoffMs) warnings.push("stale_reconciliation");
    if (pendingReconciliationCount > 0 || unknownPriceSettlements > 0) warnings.push("pending_reconciliation");
    if (isUsdCapUnset(usdSnapshot.monthlyCap)) warnings.push("usd_cap_unset");

    return {
      startingAllocation: snapshot.config.startingAllocation,
      reserveCredits: snapshot.config.reserveCredits,
      envelopes,
      adjustmentsCredits: snapshot.adjustmentsCredits,
      confirmedCredits: snapshot.confirmedCredits,
      pendingCredits: snapshot.pendingCredits,
      estimatedRemaining: snapshot.estimatedRemaining,
      lastReconciledAt: lastReconciledAt ? lastReconciledAt.toISOString() : null,
      providerBalance: null,
      warnings,
      byDay,
      usd: {
        monthlyCap: usdSnapshot.monthlyCap,
        confirmedThisMonth: usdSnapshot.confirmedThisMonth,
        pending: usdSnapshot.pendingUsd,
        available: usdSnapshot.availableUsd,
      },
    };
  },

  async listLedger(cursorRaw: string | undefined, limitRaw: unknown): Promise<{ items: LedgerEntry[]; nextCursor: string | null }> {
    const limit = clampLimit(limitRaw, 20, 50);
    const cursor = decodeCursor(cursorRaw);
    const rows = await ledgerRepository.findMany(cursor, limit + 1);
    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;
    return { items: page.map(toApiLedgerEntry), nextCursor };
  },

  async createReconciliation(input: CreateReconciliationInput): Promise<LedgerEntry> {
    const row = await ledgerRepository.insert({
      jobId: null,
      kind: LedgerKind.ADJUSTMENT,
      credits: input.credits,
      currency: LedgerCurrency.CREDITS,
      source: LedgerSource.RECONCILIATION,
      pricingVersion: null,
      note: `${input.reason} (reported source: ${input.source})`,
    });
    return toApiLedgerEntry(row);
  },

  async getBudgetSettings(): Promise<BudgetSettings> {
    const config = await budgetRepository.get();
    if (!config) throw new Error("Budget config is missing; run npm run db:seed");
    return {
      startingAllocation: config.startingAllocation,
      reserveCredits: config.reserveCredits,
      envelopes: config.envelopes as BudgetEnvelopeConfig[],
      maxConcurrentPaidJobs: config.maxConcurrentPaidJobs,
      usdMonthlyCap: config.usdMonthlyCap,
    };
  },

  async updateBudgetSettings(patch: BudgetUpdateInput): Promise<BudgetSettings> {
    const update: Parameters<typeof budgetRepository.update>[0] = {};
    if (patch.startingAllocation !== undefined) update.startingAllocation = patch.startingAllocation;
    if (patch.reserveCredits !== undefined) update.reserveCredits = patch.reserveCredits;
    if (patch.envelopes !== undefined) update.envelopes = patch.envelopes;
    if (patch.usdMonthlyCap !== undefined) update.usdMonthlyCap = patch.usdMonthlyCap;
    const config = await budgetRepository.update(update);
    return {
      startingAllocation: config.startingAllocation,
      reserveCredits: config.reserveCredits,
      envelopes: config.envelopes as BudgetEnvelopeConfig[],
      maxConcurrentPaidJobs: config.maxConcurrentPaidJobs,
      usdMonthlyCap: config.usdMonthlyCap,
    };
  },
};
