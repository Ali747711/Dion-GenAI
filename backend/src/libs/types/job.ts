import type { AudioStudioInput, JobResult } from "./audioStudio";
import type { BillingGroup, ErrorClass, JobKind, JobStatus, VariantStatus } from "../enums/job.enum";
import type { MusicInput } from "./music";
import type { UUID } from "./common";

export type JobInput = MusicInput | AudioStudioInput;

export interface Variant {
  id: UUID;
  index: 0 | 1;
  providerProductId: string | null;
  status: VariantStatus;
  rawStatus: string | null;
  durationSeconds: number | null;
  progress: number | null;
  assetId: UUID | null;
  errorMessage: string | null;
}

export interface Job {
  id: UUID;
  kind: JobKind;
  status: JobStatus;
  billing: BillingGroup;
  input: JobInput;
  projectId: UUID | null;
  estimateCredits: number;
  chargedCredits: number | null;
  estimateUsd: string | null;
  chargedUsd: string | null;
  result: JobResult | null;
  pricingVersion: string;
  providerTaskId: string | null;
  errorClass: ErrorClass | null;
  errorMessage: string | null;
  attempts: number;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface CreateJobInput {
  kind: JobKind;
  idempotencyKey: UUID;
  input: JobInput;
  projectId?: UUID;
}

export interface JobListQuery {
  status?: string;
  kind?: string;
  cursor?: string;
  limit?: number;
}
