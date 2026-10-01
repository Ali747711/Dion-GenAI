import type { JobRow, VariantRow } from "../../db/schema";
import type { BillingGroup, ErrorClass, JobKind, JobStatus, VariantStatus } from "../enums/job.enum";
import type { JobResult } from "../types/audioStudio";
import type { Job, JobInput, Variant } from "../types/job";

export function toApiVariant(row: VariantRow): Variant {
  return {
    id: row.id,
    index: row.index as 0 | 1,
    providerProductId: row.providerProductId,
    status: row.status as VariantStatus,
    rawStatus: row.rawStatus,
    durationSeconds: row.durationSeconds,
    progress: row.progress,
    assetId: row.assetId,
    errorMessage: row.errorMessage,
  };
}

export function toApiJob(row: JobRow, variantRows: VariantRow[]): Job {
  return {
    id: row.id,
    kind: row.kind as JobKind,
    status: row.status as JobStatus,
    billing: row.billing as BillingGroup,
    input: row.input as JobInput,
    projectId: row.projectId,
    estimateCredits: row.estimateCredits,
    chargedCredits: row.chargedCredits,
    estimateUsd: row.estimateUsd,
    chargedUsd: row.chargedUsd,
    result: (row.result as JobResult | null) ?? null,
    pricingVersion: row.pricingVersion,
    providerTaskId: row.providerTaskId,
    errorClass: row.errorClass as ErrorClass | null,
    errorMessage: row.errorMessage,
    attempts: row.attempts,
    variants: variantRows.sort((a, b) => a.index - b.index).map(toApiVariant),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}
