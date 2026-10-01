import { inArray, sql } from "drizzle-orm";

import { db } from "../db/client";
import { variants, type UploadRow } from "../db/schema";
import { BUDGET_ADVISORY_LOCK_KEY, MAX_CONCURRENT_PAID_JOBS_PER_GROUP, PRICING_VERSION } from "../libs/configs";
import { BillingGroup, JobKind, JobStatus, JOB_BILLING_GROUP, LedgerCurrency, LedgerKind, LedgerSource, UploadPurpose, VariantStatus } from "../libs/enums/job.enum";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import { toApiJob } from "../libs/mappers/job.mapper";
import type { Job, JobInput, JobListQuery } from "../libs/types/job";
import { hashJobRequest } from "../libs/utils/hash";
import { compareUsd, negateUsd } from "../libs/utils/decimal";
import { clampLimit, decodeCursor, encodeCursor } from "../libs/utils/pagination";
import { jobRepository } from "../repositories/job.repository";
import { ledgerRepository } from "../repositories/ledger.repository";
import { outboxRepository } from "../repositories/outbox.repository";
import { projectRepository } from "../repositories/project.repository";
import { uploadRepository } from "../repositories/upload.repository";
import { variantRepository } from "../repositories/variant.repository";
import { computeBudgetSnapshot } from "./budgetMath.service";
import { computeUsdBudgetSnapshot, isUsdCapUnset } from "./usdBudgetMath.service";
import { priceJob } from "./pricing.service";

export interface CreateJobRequest {
  kind: JobKind;
  idempotencyKey: string;
  input: JobInput;
  projectId?: string;
}

export interface CreateJobOutcome {
  job: Job;
  alreadyExisted: boolean;
}

/** Which upload `purpose` a kind's `input.uploadId` must reference. */
const UPLOAD_PURPOSE_BY_KIND: Partial<Record<JobKind, UploadPurpose>> = {
  [JobKind.COVER]: UploadPurpose.COVER_SOURCE,
  [JobKind.LYRICS_RECOGNITION]: UploadPurpose.COVER_SOURCE,
  [JobKind.VOICE_CLONE]: UploadPurpose.VOICE_SAMPLE,
  [JobKind.TRANSCRIPTION]: UploadPurpose.TRANSCRIPTION,
};

/** Variant rows created up front, at job creation. `voice_design`'s previews are created later, once the provider result is known. */
function initialVariantCount(kind: JobKind): number {
  if (kind === JobKind.MUSIC || kind === JobKind.COVER) return 2;
  if (kind === JobKind.SOUND || kind === JobKind.SPEECH) return 1;
  return 0;
}

function envelopeForBilling(billing: BillingGroup): string {
  return billing === BillingGroup.CREDITS ? "music" : "usd";
}

async function loadJob(id: string): Promise<Job | null> {
  const row = await jobRepository.findById(id);
  if (!row) return null;
  const variantRows = await variantRepository.findByJobId(id);
  return toApiJob(row, variantRows);
}

async function resolveReferencedUpload(kind: JobKind, input: JobInput): Promise<UploadRow | null> {
  const expectedPurpose = UPLOAD_PURPOSE_BY_KIND[kind];
  if (!expectedPurpose) return null;

  const uploadId = (input as { uploadId?: string }).uploadId;
  if (!uploadId) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { uploadId: "uploadId is required" } });
  }
  const upload = await uploadRepository.findById(uploadId);
  if (!upload) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { uploadId: "Upload not found or expired" } });
  }
  if (upload.purpose !== expectedPurpose) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, {
      fields: { uploadId: `Upload purpose must be '${expectedPurpose}' for this job kind` },
    });
  }
  return upload;
}

export const jobService = {
  async createJob(request: CreateJobRequest): Promise<CreateJobOutcome> {
    const requestHash = hashJobRequest({ kind: request.kind, input: request.input, projectId: request.projectId ?? null });

    const preExisting = await jobRepository.findByIdempotencyKey(request.idempotencyKey);
    if (preExisting) {
      return respondToIdempotentReplay(preExisting.id, preExisting.requestHash, requestHash);
    }

    if (request.projectId) {
      const project = await projectRepository.findById(request.projectId);
      if (!project) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { projectId: "Project not found" } });
      }
    }

    const upload = await resolveReferencedUpload(request.kind, request.input);
    const billing = JOB_BILLING_GROUP[request.kind];
    const pricing = priceJob(request.kind, request.input, { uploadDurationSeconds: upload?.durationSeconds ?? null });

    const result = await db.transaction(async (tx) => {
      // Serialize every job-creation attempt on a single advisory lock so the
      // in-flight check and the budget check are race-free without needing
      // per-row locking.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${BUDGET_ADVISORY_LOCK_KEY})`);

      const existingInTx = await jobRepository.findByIdempotencyKey(request.idempotencyKey, tx);
      if (existingInTx) {
        return { kind: "existing" as const, jobId: existingInTx.id, requestHash: existingInTx.requestHash };
      }

      const inFlight = await jobRepository.countInFlightByGroup(billing, tx);
      if (inFlight >= MAX_CONCURRENT_PAID_JOBS_PER_GROUP) {
        throw new AppError(ErrorCode.CONFLICT, `A ${billing} job is already in flight (concurrency limit is 1 per billing group)`);
      }

      if (billing === BillingGroup.CREDITS) {
        const { estimatedRemaining } = await computeBudgetSnapshot(tx);
        const estimateCredits = pricing.credits ?? 0;
        if (estimatedRemaining < estimateCredits) {
          throw new AppError(ErrorCode.INSUFFICIENT_BUDGET, Message.INSUFFICIENT_BUDGET);
        }
      } else {
        const usdSnapshot = await computeUsdBudgetSnapshot(tx);
        if (isUsdCapUnset(usdSnapshot.monthlyCap)) {
          throw new AppError(ErrorCode.CAPABILITY_UNAVAILABLE, "Set a USD pay-as-you-go cap in Settings");
        }
        const estimateUsd = pricing.usd ?? "0";
        if (compareUsd(usdSnapshot.availableUsd, estimateUsd) < 0) {
          throw new AppError(ErrorCode.INSUFFICIENT_BUDGET, Message.INSUFFICIENT_BUDGET);
        }
      }

      const job = await jobRepository.insert(
        {
          kind: request.kind,
          status: JobStatus.QUEUED,
          input: request.input,
          projectId: request.projectId ?? null,
          envelope: envelopeForBilling(billing),
          billing,
          estimateCredits: billing === BillingGroup.CREDITS ? (pricing.credits ?? 0) : 0,
          estimateUsd: billing === BillingGroup.USD ? (pricing.usd ?? "0") : null,
          pricingVersion: PRICING_VERSION,
          idempotencyKey: request.idempotencyKey,
          requestHash,
        },
        tx
      );

      const variantCount = initialVariantCount(request.kind);
      if (variantCount > 0) {
        await variantRepository.insertMany(
          Array.from({ length: variantCount }, (_, index) => ({ jobId: job.id, index, status: VariantStatus.PENDING })),
          tx
        );
      }

      if (billing === BillingGroup.CREDITS) {
        await ledgerRepository.insert(
          {
            jobId: job.id,
            kind: LedgerKind.RESERVATION,
            credits: -(pricing.credits ?? 0),
            currency: LedgerCurrency.CREDITS,
            source: LedgerSource.APP,
            pricingVersion: PRICING_VERSION,
            note: "Reservation created at job submission",
          },
          tx
        );
      } else {
        await ledgerRepository.insert(
          {
            jobId: job.id,
            kind: LedgerKind.RESERVATION,
            credits: 0,
            usdEstimate: negateUsd(pricing.usd ?? "0"),
            currency: LedgerCurrency.USD,
            source: LedgerSource.APP,
            pricingVersion: PRICING_VERSION,
            note: "USD reservation created at job submission",
          },
          tx
        );
      }

      if (upload) {
        await uploadRepository.markConsumed(upload.id, tx);
      }

      await outboxRepository.insert(job.id, tx);

      return { kind: "created" as const, jobId: job.id, requestHash: job.requestHash };
    });

    if (result.kind === "existing") {
      return respondToIdempotentReplay(result.jobId, result.requestHash, requestHash);
    }

    const job = await loadJob(result.jobId);
    if (!job) throw new Error("Job vanished immediately after creation");
    return { job, alreadyExisted: false };
  },

  async getJob(id: string): Promise<Job> {
    const job = await loadJob(id);
    if (!job) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return job;
  },

  async listJobs(query: JobListQuery): Promise<{ items: Job[]; nextCursor: string | null }> {
    const limit = clampLimit(query.limit, 20, 50);
    const cursor = decodeCursor(query.cursor);

    const rows = await jobRepository.findMany({ status: query.status, kind: query.kind, cursor, limit: limit + 1 });
    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;

    const jobIds = page.map((row) => row.id);
    const variantRows = jobIds.length > 0 ? await db.select().from(variants).where(inArray(variants.jobId, jobIds)) : [];
    const variantsByJob = new Map<string, typeof variantRows>();
    for (const variant of variantRows) {
      const list = variantsByJob.get(variant.jobId) ?? [];
      list.push(variant);
      variantsByJob.set(variant.jobId, list);
    }

    const items = page.map((row) => toApiJob(row, variantsByJob.get(row.id) ?? []));
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

    return { items, nextCursor };
  },

  async cancelJob(id: string): Promise<Job> {
    const updatedId = await db.transaction(async (tx) => {
      const current = await jobRepository.findById(id, tx);
      if (!current) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
      if (current.status !== JobStatus.QUEUED) {
        throw new AppError(ErrorCode.CONFLICT, "Only a queued job can be cancelled before submission");
      }

      if (current.billing === BillingGroup.CREDITS) {
        await ledgerRepository.insert(
          {
            jobId: current.id,
            kind: LedgerKind.RESERVATION_RELEASE,
            credits: current.estimateCredits,
            currency: LedgerCurrency.CREDITS,
            source: LedgerSource.APP,
            pricingVersion: current.pricingVersion,
            note: "Reservation released: cancelled before submission",
          },
          tx
        );
      } else {
        await ledgerRepository.insert(
          {
            jobId: current.id,
            kind: LedgerKind.RESERVATION_RELEASE,
            credits: 0,
            usdEstimate: current.estimateUsd,
            currency: LedgerCurrency.USD,
            source: LedgerSource.APP,
            pricingVersion: current.pricingVersion,
            note: "USD reservation released: cancelled before submission",
          },
          tx
        );
      }

      await jobRepository.update(current.id, { status: JobStatus.CANCELLED_BEFORE_SUBMISSION, completedAt: new Date() }, tx);
      return current.id;
    });

    await outboxRepository.markCancelledForJob(updatedId);

    const job = await loadJob(updatedId);
    if (!job) throw new Error("Job vanished after cancel");
    return job;
  },
};

async function respondToIdempotentReplay(jobId: string, storedHash: string, incomingHash: string): Promise<CreateJobOutcome> {
  if (storedHash !== incomingHash) {
    throw new AppError(ErrorCode.CONFLICT, "idempotencyKey was already used with a different request payload");
  }
  const job = await loadJob(jobId);
  if (!job) throw new Error("Existing job vanished during idempotent replay");
  return { job, alreadyExisted: true };
}
