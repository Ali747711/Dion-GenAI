import type { JobKind } from "../enums/job.enum";
import type { BillingGroup } from "../enums/job.enum";

/** R2 superset of the R1 Estimate shape (API_CONTRACT.md § R2 Type changes). */
export interface Estimate {
  kind: JobKind;
  billing: BillingGroup;
  credits: number | null;
  usd: string | null;
  assumption: string;
  pricingVersion: string;
  verified: boolean;
  availableCredits: number;
  availableUsd: string;
  expiresAt: string;
}
