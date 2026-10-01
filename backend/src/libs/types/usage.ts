export type UsageWarning = "low_budget" | "unverified_pricing" | "stale_reconciliation" | "pending_reconciliation" | "usd_cap_unset";

export interface UsageUsdBlock {
  monthlyCap: string;
  confirmedThisMonth: string;
  pending: string;
  available: string;
}

export interface UsageEnvelope {
  key: "music" | "supporting" | "validation";
  label: string;
  allocated: number;
  confirmedCredits: number;
  pendingCredits: number;
}

export interface Usage {
  startingAllocation: number;
  reserveCredits: number;
  envelopes: UsageEnvelope[];
  adjustmentsCredits: number;
  confirmedCredits: number;
  pendingCredits: number;
  estimatedRemaining: number;
  lastReconciledAt: string | null;
  providerBalance: null;
  warnings: UsageWarning[];
  byDay: { date: string; credits: number }[];
  usd: UsageUsdBlock;
}

export interface BudgetSettings {
  startingAllocation: number;
  reserveCredits: number;
  envelopes: { key: "music" | "supporting" | "validation"; label: string; allocated: number }[];
  maxConcurrentPaidJobs: number;
  usdMonthlyCap: string;
}

export interface BudgetUpdateInput {
  startingAllocation?: number;
  reserveCredits?: number;
  envelopes?: { key: "music" | "supporting" | "validation"; label: string; allocated: number }[];
  usdMonthlyCap?: string;
}
