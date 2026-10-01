import type { LedgerCurrency, LedgerKind, LedgerSource } from "../enums/job.enum";
import type { UUID } from "./common";

export interface LedgerEntry {
  id: UUID;
  jobId: UUID | null;
  kind: LedgerKind;
  credits: number;
  usdEstimate: string | null;
  currency: LedgerCurrency;
  source: LedgerSource;
  pricingVersion: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateReconciliationInput {
  credits: number;
  reason: string;
  source: string;
}
