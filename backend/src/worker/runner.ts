import { randomUUID } from "node:crypto";

import { db } from "../db/client";
import { env } from "../config/env";
import { UPLOAD_CLEANUP_INTERVAL_MS } from "../libs/configs";
import { BillingGroup, ErrorClass, JobKind, JobStatus, LedgerCurrency, LedgerKind, LedgerSource } from "../libs/enums/job.enum";
import { logger } from "../libs/utils/logger";
import { jobRepository } from "../repositories/job.repository";
import { ledgerRepository } from "../repositories/ledger.repository";
import { outboxRepository } from "../repositories/outbox.repository";
import { getAudioStudioProvider, getMusicProvider } from "../services/provider/provider.factory";
import { uploadService } from "../services/upload.service";
import { computeBackoffMs } from "./backoff";
import { processCoverJobTick, processJobTick, processSyncJobTick, type TickResult } from "./jobProcessor";

const WORKER_ID = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

/**
 * Claims and processes a single due outbox row. Returns whether it did any
 * work (false means the queue was empty and the caller should idle).
 */
export async function tickOnce(): Promise<boolean> {
  const claimed = await outboxRepository.claimNext(WORKER_ID, env.WORKER_LEASE_MS);
  if (!claimed) return false;

  try {
    const result = await processClaimedJob(claimed.jobId);
    if (result.done) {
      await outboxRepository.markDone(claimed.id);
    } else {
      await outboxRepository.reschedule(claimed.id, new Date(Date.now() + env.WORKER_POLL_INTERVAL_MS), claimed.attempts, null);
    }
  } catch (error) {
    await handleTickFailure(claimed.id, claimed.jobId, claimed.attempts, error);
  }

  return true;
}

/** Routes a claimed outbox row to the right pipeline for its job's kind (music/cover are async submit-then-poll; the rest are one-shot sync). */
async function processClaimedJob(jobId: string): Promise<TickResult> {
  const job = await jobRepository.findById(jobId);
  if (!job) return { done: true };

  if (job.kind === JobKind.MUSIC) {
    return processJobTick(jobId, getMusicProvider());
  }
  if (job.kind === JobKind.COVER) {
    return processCoverJobTick(jobId, getAudioStudioProvider());
  }
  return processSyncJobTick(jobId, getAudioStudioProvider());
}

async function handleTickFailure(outboxId: string, jobId: string, previousAttempts: number, error: unknown): Promise<void> {
  const attempts = previousAttempts + 1;
  const message = error instanceof Error ? error.message : String(error);
  logger.warn({ err: error, jobId, attempts }, "Job processing tick failed");

  if (attempts >= env.WORKER_MAX_ATTEMPTS) {
    await outboxRepository.markDead(outboxId, message);
    await failJobAfterExhaustedRetries(jobId, message);
    return;
  }

  const delayMs = computeBackoffMs(attempts);
  await outboxRepository.reschedule(outboxId, new Date(Date.now() + delayMs), attempts, message);
}

async function failJobAfterExhaustedRetries(jobId: string, message: string): Promise<void> {
  const job = await jobRepository.findById(jobId);
  if (!job) return;

  if (job.status === JobStatus.QUEUED) {
    // Never successfully submitted: safe to release the reservation and fail outright.
    await db.transaction(async (tx) => {
      if (job.billing === BillingGroup.CREDITS) {
        await ledgerRepository.insert(
          {
            jobId,
            kind: LedgerKind.RESERVATION_RELEASE,
            credits: job.estimateCredits,
            currency: LedgerCurrency.CREDITS,
            source: LedgerSource.APP,
            pricingVersion: job.pricingVersion,
            note: "Reservation released after exhausted retries (never submitted)",
          },
          tx
        );
      } else {
        await ledgerRepository.insert(
          {
            jobId,
            kind: LedgerKind.RESERVATION_RELEASE,
            credits: 0,
            usdEstimate: job.estimateUsd,
            currency: LedgerCurrency.USD,
            source: LedgerSource.APP,
            pricingVersion: job.pricingVersion,
            note: "USD reservation released after exhausted retries (never submitted)",
          },
          tx
        );
      }
      await jobRepository.update(jobId, { status: JobStatus.FAILED, errorClass: ErrorClass.PROVIDER_UNAVAILABLE, errorMessage: message, completedAt: new Date() }, tx);
    });
    return;
  }

  // Already submitted/running: outcome is ambiguous. Keep the reservation and
  // surface a reconciliation task instead of guessing.
  await jobRepository.update(jobId, {
    status: JobStatus.RECONCILIATION_REQUIRED,
    errorClass: ErrorClass.POLLING_FAILED,
    errorMessage: message,
    completedAt: new Date(),
  });
}

let lastUploadCleanupAt = 0;

/** Deletes uploads that were never consumed by a job, past their 24h expiry. Throttled to run at most every UPLOAD_CLEANUP_INTERVAL_MS. */
async function runUploadCleanupIfDue(): Promise<void> {
  if (Date.now() - lastUploadCleanupAt < UPLOAD_CLEANUP_INTERVAL_MS) return;
  lastUploadCleanupAt = Date.now();
  try {
    const removed = await uploadService.cleanupExpired();
    if (removed > 0) logger.info({ removed }, "Cleaned up expired, unconsumed uploads");
  } catch (error) {
    logger.warn({ err: error }, "Upload cleanup routine failed");
  }
}

export function startWorkerLoop(): { stop: () => void } {
  let stopped = false;

  const loop = async (): Promise<void> => {
    while (!stopped) {
      try {
        const didWork = await tickOnce();
        await runUploadCleanupIfDue();
        if (!didWork) await sleep(env.WORKER_POLL_INTERVAL_MS);
      } catch (error) {
        logger.error({ err: error }, "Worker loop iteration failed unexpectedly");
        await sleep(env.WORKER_POLL_INTERVAL_MS);
      }
    }
  };

  void loop();
  return {
    stop: () => {
      stopped = true;
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
