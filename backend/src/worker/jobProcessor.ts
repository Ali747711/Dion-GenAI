import { promises as fs } from "node:fs";

import { db } from "../db/client";
import type { AssetRow, JobRow, UploadRow, VariantRow } from "../db/schema";
import { CREDITS_PER_SECOND, JOB_TERMINAL_STATUSES, LYRICS_RECOGNITION_ESTIMATE_CREDITS, SOUND_USD_PER_SECOND } from "../libs/configs";
import {
  AssetSource,
  BillingGroup,
  ErrorClass,
  JobKind,
  JobStatus,
  LedgerCurrency,
  LedgerKind,
  LedgerSource,
  VariantStatus,
  VoiceDeletionStatus,
  VoiceType,
} from "../libs/enums/job.enum";
import type {
  CoverInput,
  EmotionInput,
  JobResult,
  LyricsRecognitionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  VoiceCloneInput,
  VoiceDesignInput,
} from "../libs/types/audioStudio";
import type { JobInput } from "../libs/types/job";
import type { MusicInput } from "../libs/types/music";
import { sniffAudioMime } from "../libs/utils/audioSniff";
import { negateUsd, usdFromNumber } from "../libs/utils/decimal";
import { probeAudioDurationSeconds } from "../libs/utils/ffprobe";
import { logger } from "../libs/utils/logger";
import { assetRepository } from "../repositories/asset.repository";
import { jobRepository } from "../repositories/job.repository";
import { ledgerRepository } from "../repositories/ledger.repository";
import { uploadRepository } from "../repositories/upload.repository";
import { variantRepository } from "../repositories/variant.repository";
import { voiceRepository } from "../repositories/voice.repository";
import type {
  AudioStudioProviderAdapter,
  CoverPollResult,
  CoverVariantResult,
} from "../services/provider/audioStudio.types";
import {
  ProviderBusinessError,
  ProviderTimeoutError,
  ProviderTransientError,
  type MusicProviderAdapter,
  type ProviderPollResult,
} from "../services/provider/provider.types";
import { safeFetch } from "../services/safeFetch.service";
import { storageService } from "../services/storage.service";

export interface TickResult {
  /** true once the job has reached a terminal state and its outbox row can be closed. */
  done: boolean;
}

// ============================================================================
// MUSIC (R1) — unchanged behavior, only `ingestResult`'s MIME handling now
// sniffs the real bytes (falling back to audio/mpeg) instead of hardcoding it.
// ============================================================================

/**
 * Advances one `music` job by exactly one step (submit, or poll all open
 * variants). Called by the worker's claim loop; also called directly by
 * tests so timing-sensitive behavior can be exercised without real sleeps.
 */
export async function processJobTick(jobId: string, provider: MusicProviderAdapter): Promise<TickResult> {
  const job = await jobRepository.findById(jobId);
  if (!job || (JOB_TERMINAL_STATUSES as readonly string[]).includes(job.status)) {
    return { done: true };
  }

  if (job.status === JobStatus.QUEUED) {
    return submitJob(job, provider);
  }

  if (job.status === JobStatus.SUBMITTING) {
    // We committed submission intent but the worker crashed/restarted before
    // recording a response. Indistinguishable from a network timeout: do not
    // blindly retry a paid submission.
    await markSubmissionUnknown(job, "Worker restarted after committing submission intent but before a response was recorded");
    return { done: true };
  }

  if (job.status === JobStatus.SUBMITTED || job.status === JobStatus.RUNNING) {
    return pollJob(job, provider);
  }

  return { done: true };
}

async function submitJob(job: JobRow, provider: MusicProviderAdapter): Promise<TickResult> {
  const variantRows = await variantRepository.findByJobId(job.id);

  // Commit submission intent BEFORE dispatch (durable even if the process
  // crashes mid-request).
  await jobRepository.update(job.id, { status: JobStatus.SUBMITTING });

  try {
    const result = await provider.submit(job.input as MusicInput);

    for (const variant of result.variants) {
      const row = variantRows.find((v) => v.index === variant.index);
      if (!row) continue;
      await variantRepository.update(row.id, { providerProductId: variant.providerProductId, status: VariantStatus.RUNNING });
    }

    await jobRepository.update(job.id, {
      status: JobStatus.SUBMITTED,
      submittedAt: new Date(),
      providerTaskId: result.variants.map((v) => v.providerProductId).join(","),
    });
    return { done: false };
  } catch (error) {
    if (error instanceof ProviderTimeoutError) {
      await markSubmissionUnknown(job, error.message);
      return { done: true };
    }
    if (error instanceof ProviderBusinessError) {
      await failBeforeSubmission(job, error.errorClass, error.message);
      return { done: true };
    }
    // Definite, non-ambiguous transient failure (e.g. connection refused) —
    // safe to revert to queued and let the caller retry with backoff.
    await jobRepository.update(job.id, { status: JobStatus.QUEUED });
    throw error;
  }
}

async function pollJob(job: JobRow, provider: MusicProviderAdapter): Promise<TickResult> {
  const variantRows = await variantRepository.findByJobId(job.id);
  let hadTransientError = false;

  for (const variant of variantRows) {
    if (isVariantTerminal(variant.status)) continue;
    if (!variant.providerProductId) continue;

    let pollResult: ProviderPollResult;
    try {
      pollResult = await provider.poll(variant.providerProductId, {
        submittedAt: job.submittedAt ?? new Date(),
        index: variant.index as 0 | 1,
      });
    } catch (error) {
      if (error instanceof ProviderBusinessError) {
        await variantRepository.update(variant.id, { status: VariantStatus.FAILED, rawStatus: "business_error", errorMessage: error.message });
        continue;
      }
      logger.warn({ err: error, variantId: variant.id }, "Transient polling error");
      hadTransientError = true;
      continue;
    }

    await applyPollResult(job, variant, pollResult);
  }

  if (job.status !== JobStatus.RUNNING) {
    await jobRepository.update(job.id, { status: JobStatus.RUNNING });
  }

  const refreshed = await variantRepository.findByJobId(job.id);
  await linkSiblingAssets(refreshed);

  const allTerminal = refreshed.every((v) => isVariantTerminal(v.status));
  if (!allTerminal) {
    if (hadTransientError) throw new ProviderTransientError("Polling failed for one or more variants this tick");
    return { done: false };
  }

  await settleJob(job, refreshed);
  return { done: true };
}

async function applyPollResult(job: JobRow, variant: VariantRow, result: ProviderPollResult): Promise<void> {
  if (result.status === "succeeded") {
    const asset = await ingestResult(job, variant, result);
    await variantRepository.update(variant.id, {
      status: VariantStatus.SUCCEEDED,
      rawStatus: result.rawStatus,
      durationSeconds: result.durationSeconds,
      progress: 100,
      assetId: asset.id,
    });
    return;
  }
  if (result.status === "failed") {
    await variantRepository.update(variant.id, {
      status: VariantStatus.FAILED,
      rawStatus: result.rawStatus,
      errorMessage: result.errorMessage ?? "Generation failed",
    });
    return;
  }
  if (result.status === "unknown") {
    await variantRepository.update(variant.id, { status: VariantStatus.UNKNOWN, rawStatus: result.rawStatus });
    return;
  }
  await variantRepository.update(variant.id, { status: VariantStatus.RUNNING, rawStatus: result.rawStatus, progress: result.progress });
}

async function ingestResult(job: JobRow, variant: VariantRow, result: ProviderPollResult) {
  if (!result.resultLocation) {
    throw new ProviderTransientError("Provider reported success but returned no result location");
  }
  const input = job.input as MusicInput;
  const title = input.title && input.title.length > 0 ? input.title : input.prompt.slice(0, 80);

  return ingestAudioFromLocalPath({
    jobId: job.id,
    variantId: variant.id,
    variantIndex: variant.index,
    projectId: job.projectId,
    sourcePath: result.resultLocation,
    fallbackMimeType: "audio/mpeg",
    durationSeconds: result.durationSeconds,
    source: AssetSource.MUSIC,
    title,
    lyrics: input.lyricsMode === "lyrics" ? (input.lyrics ?? null) : null,
    prompt: input.prompt,
    tags: input.tags ?? [],
  });
}

async function linkSiblingAssets(variantRows: VariantRow[]): Promise<void> {
  const withAssets = variantRows.filter((v) => v.status === VariantStatus.SUCCEEDED && v.assetId);
  if (withAssets.length !== 2) return;
  const [first, second] = withAssets;
  if (!first?.assetId || !second?.assetId) return;

  const firstAsset = await assetRepository.findById(first.assetId);
  const secondAsset = await assetRepository.findById(second.assetId);
  if (firstAsset && !firstAsset.siblingAssetId) await assetRepository.update(first.assetId, { siblingAssetId: second.assetId });
  if (secondAsset && !secondAsset.siblingAssetId) await assetRepository.update(second.assetId, { siblingAssetId: first.assetId });
}

async function settleJob(job: JobRow, variantRows: VariantRow[]): Promise<void> {
  const succeeded = variantRows.filter((v) => v.status === VariantStatus.SUCCEEDED);
  const unknown = variantRows.filter((v) => v.status === VariantStatus.UNKNOWN);

  if (unknown.length > 0 && succeeded.length === 0) {
    await jobRepository.update(job.id, {
      status: JobStatus.RECONCILIATION_REQUIRED,
      errorClass: ErrorClass.POLLING_FAILED,
      errorMessage: "One or more variants returned an unknown status; manual reconciliation required",
      completedAt: new Date(),
    });
    return;
  }

  const finalStatus = succeeded.length === variantRows.length ? JobStatus.SUCCEEDED : succeeded.length > 0 ? JobStatus.PARTIALLY_SUCCEEDED : JobStatus.FAILED;
  // "ceil(longer variant duration) x 15 credits/s" — ceil the seconds first, then multiply.
  const chargedCredits = succeeded.length > 0 ? Math.ceil(Math.max(...succeeded.map((v) => v.durationSeconds ?? 0))) * CREDITS_PER_SECOND : 0;

  await db.transaction(async (tx) => {
    // Idempotent: a second settlement attempt for the same job (e.g. two
    // overlapping poll ticks) is a no-op thanks to the unique settlement key.
    const charge = await ledgerRepository.insertSettlementCharge(
      {
        jobId: job.id,
        kind: LedgerKind.CHARGE,
        credits: -chargedCredits,
        currency: LedgerCurrency.CREDITS,
        source: LedgerSource.PROVIDER,
        pricingVersion: job.pricingVersion,
        note: "Settled charge based on longer variant duration",
        settlementKey: job.id,
      },
      tx
    );
    if (charge === null) return;

    await ledgerRepository.insert(
      {
        jobId: job.id,
        kind: LedgerKind.RESERVATION_RELEASE,
        credits: job.estimateCredits,
        currency: LedgerCurrency.CREDITS,
        source: LedgerSource.APP,
        pricingVersion: job.pricingVersion,
        note: "Reservation released at settlement",
      },
      tx
    );

    await jobRepository.update(
      job.id,
      {
        status: finalStatus,
        chargedCredits,
        completedAt: new Date(),
        errorClass: finalStatus === JobStatus.FAILED ? ErrorClass.GENERATION_FAILED : null,
        errorMessage: finalStatus === JobStatus.FAILED ? "Both variants failed to generate" : null,
      },
      tx
    );
  });
}

function isVariantTerminal(status: string): boolean {
  return status === VariantStatus.SUCCEEDED || status === VariantStatus.FAILED || status === VariantStatus.UNKNOWN;
}

// ============================================================================
// Shared helpers (R1 + R2)
// ============================================================================

async function sniffMimeOrFallback(filePath: string, fallback: string): Promise<string> {
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const buffer = Buffer.alloc(64);
      const { bytesRead } = await handle.read(buffer, 0, 64, 0);
      return sniffAudioMime(buffer.subarray(0, bytesRead)) ?? fallback;
    } finally {
      await handle.close();
    }
  } catch {
    return fallback;
  }
}

interface IngestFromPathParams {
  jobId: string;
  variantId: string;
  variantIndex: number;
  projectId: string | null;
  sourcePath: string;
  fallbackMimeType: string;
  durationSeconds: number | null;
  source: AssetSource;
  title: string;
  lyrics?: string | null;
  prompt?: string | null;
  tags?: string[];
}

const RESULT_DOWNLOAD_TIMEOUT_MS = 120_000;

/**
 * Live providers return an https result URL; mock returns a local path. Remote results
 * go through safeFetch (SSRF-guarded). A failed download is transient so the worker
 * retries the download on the next tick instead of ever re-submitting the generation.
 */
async function ingestAudioFromLocalPath(params: IngestFromPathParams): Promise<AssetRow> {
  if (/^https?:\/\//i.test(params.sourcePath)) {
    let downloaded: Awaited<ReturnType<typeof safeFetch>>;
    try {
      downloaded = await safeFetch(params.sourcePath, { timeoutMs: RESULT_DOWNLOAD_TIMEOUT_MS });
    } catch (error) {
      logger.warn({ err: error, jobId: params.jobId, variantId: params.variantId }, "Result download failed; will retry download");
      throw new ProviderTransientError("Result download failed; retrying download (generation is not resubmitted)");
    }
    const { variantId, variantIndex, sourcePath: _sourcePath, ...rest } = params;
    return storeBufferAsAsset({ ...rest, variantId, variantIndex, buffer: downloaded.buffer });
  }
  const mimeType = await sniffMimeOrFallback(params.sourcePath, params.fallbackMimeType);
  const { storageKey, bytes } = await storageService.copyFrom(params.sourcePath, mimeType);
  return assetRepository.insert({
    kind: "audio",
    source: params.source,
    title: params.title,
    jobId: params.jobId,
    variantId: params.variantId,
    variantIndex: params.variantIndex,
    projectId: params.projectId,
    storageKey,
    mimeType,
    bytes,
    durationSeconds: params.durationSeconds,
    lyrics: params.lyrics ?? null,
    prompt: params.prompt ?? null,
    tags: params.tags ?? [],
  });
}

interface StoreBufferAssetParams {
  jobId: string;
  variantId: string | null;
  variantIndex: number | null;
  projectId: string | null;
  buffer: Buffer;
  fallbackMimeType: string;
  durationSeconds: number | null;
  source: AssetSource;
  title: string;
  lyrics?: string | null;
  prompt?: string | null;
  tags?: string[];
}

/** Stores an in-memory result buffer (mock-generated WAV, or a live provider's binary response) as a real asset, sniffing its true MIME type. */
async function storeBufferAsAsset(params: StoreBufferAssetParams): Promise<AssetRow> {
  const mimeType = sniffAudioMime(params.buffer) ?? params.fallbackMimeType;
  const { storageKey, bytes } = await storageService.storeBuffer(params.buffer, mimeType);
  return assetRepository.insert({
    kind: "audio",
    source: params.source,
    title: params.title,
    jobId: params.jobId,
    variantId: params.variantId,
    variantIndex: params.variantIndex,
    projectId: params.projectId,
    storageKey,
    mimeType,
    bytes,
    durationSeconds: params.durationSeconds,
    lyrics: params.lyrics ?? null,
    prompt: params.prompt ?? null,
    tags: params.tags ?? [],
  });
}

async function markSubmissionUnknown(job: JobRow, message: string): Promise<void> {
  logger.warn({ jobId: job.id, message }, "Job submission outcome is unknown; reservation kept, no auto-retry");
  await jobRepository.update(job.id, {
    status: JobStatus.SUBMISSION_UNKNOWN,
    errorClass: ErrorClass.AMBIGUOUS_SUBMISSION,
    errorMessage: "The submission request timed out; it is unknown whether the provider received it. Reservation kept pending manual reconciliation.",
    completedAt: new Date(),
  });
}

/** Releases whichever reservation type (credits or USD) this job holds and marks it failed — safe because nothing was ever submitted/executed. */
async function failBeforeSubmission(job: JobRow, errorClass: ErrorClass, message: string): Promise<void> {
  await db.transaction(async (tx) => {
    if (job.billing === BillingGroup.CREDITS) {
      await ledgerRepository.insert(
        {
          jobId: job.id,
          kind: LedgerKind.RESERVATION_RELEASE,
          credits: job.estimateCredits,
          currency: LedgerCurrency.CREDITS,
          source: LedgerSource.APP,
          pricingVersion: job.pricingVersion,
          note: "Reservation released: submission rejected before any generation started",
        },
        tx
      );
    } else {
      await ledgerRepository.insert(
        {
          jobId: job.id,
          kind: LedgerKind.RESERVATION_RELEASE,
          credits: 0,
          usdEstimate: job.estimateUsd,
          currency: LedgerCurrency.USD,
          source: LedgerSource.APP,
          pricingVersion: job.pricingVersion,
          note: "USD reservation released: submission rejected before any generation started",
        },
        tx
      );
    }
    await jobRepository.update(job.id, { status: JobStatus.FAILED, errorClass, errorMessage: message, completedAt: new Date() }, tx);
  });
}

async function requireUpload(uploadId: string): Promise<UploadRow> {
  const upload = await uploadRepository.findById(uploadId);
  if (!upload) throw new ProviderBusinessError("Referenced upload no longer exists", ErrorClass.INVALID_INPUT);
  return upload;
}

async function readUploadBytes(upload: UploadRow): Promise<Buffer> {
  return fs.readFile(storageService.absolutePath(upload.storageKey));
}

// ============================================================================
// COVER (R2) — async submit-then-poll, like music, but one task_id poll
// endpoint returns both variants, and settlement is "either fails -> 0".
// ============================================================================

export async function processCoverJobTick(jobId: string, provider: AudioStudioProviderAdapter): Promise<TickResult> {
  const job = await jobRepository.findById(jobId);
  if (!job || (JOB_TERMINAL_STATUSES as readonly string[]).includes(job.status)) {
    return { done: true };
  }

  if (job.status === JobStatus.QUEUED) {
    return submitCoverJob(job, provider);
  }

  if (job.status === JobStatus.SUBMITTING) {
    await markSubmissionUnknown(job, "Worker restarted after committing submission intent but before a response was recorded");
    return { done: true };
  }

  if (job.status === JobStatus.SUBMITTED || job.status === JobStatus.RUNNING) {
    return pollCoverJob(job, provider);
  }

  return { done: true };
}

async function submitCoverJob(job: JobRow, provider: AudioStudioProviderAdapter): Promise<TickResult> {
  const input = job.input as CoverInput;
  await jobRepository.update(job.id, { status: JobStatus.SUBMITTING });

  try {
    const upload = await requireUpload(input.uploadId);
    const buffer = await readUploadBytes(upload);
    const result = await provider.submitCover(input, buffer, upload.mimeType);

    await jobRepository.update(job.id, {
      status: JobStatus.SUBMITTED,
      submittedAt: new Date(),
      providerTaskId: result.taskId,
    });
    return { done: false };
  } catch (error) {
    if (error instanceof ProviderTimeoutError) {
      await markSubmissionUnknown(job, error.message);
      return { done: true };
    }
    if (error instanceof ProviderBusinessError) {
      await failBeforeSubmission(job, error.errorClass, error.message);
      return { done: true };
    }
    await jobRepository.update(job.id, { status: JobStatus.QUEUED });
    throw error;
  }
}

async function pollCoverJob(job: JobRow, provider: AudioStudioProviderAdapter): Promise<TickResult> {
  const variantRows = await variantRepository.findByJobId(job.id);
  if (!job.providerTaskId) {
    throw new ProviderTransientError("Cover job is missing its provider task id");
  }

  let pollResult: CoverPollResult | null = null;
  let hadTransientError = false;
  try {
    pollResult = await provider.pollCover(job.providerTaskId, { submittedAt: job.submittedAt ?? new Date() });
  } catch (error) {
    if (error instanceof ProviderBusinessError) {
      for (const variant of variantRows) {
        if (isVariantTerminal(variant.status)) continue;
        await variantRepository.update(variant.id, { status: VariantStatus.FAILED, rawStatus: "business_error", errorMessage: error.message });
      }
    } else {
      logger.warn({ err: error, jobId: job.id }, "Transient cover polling error");
      hadTransientError = true;
    }
  }

  if (pollResult) {
    for (const variantResult of pollResult.variants) {
      const row = variantRows.find((v) => v.index === variantResult.index);
      if (!row || isVariantTerminal(row.status)) continue;
      await applyCoverVariantResult(job, row, variantResult);
    }
  }

  if (job.status !== JobStatus.RUNNING) {
    await jobRepository.update(job.id, { status: JobStatus.RUNNING });
  }

  const refreshed = await variantRepository.findByJobId(job.id);
  await linkSiblingAssets(refreshed);

  const allTerminal = refreshed.every((v) => isVariantTerminal(v.status));
  if (!allTerminal) {
    if (hadTransientError) throw new ProviderTransientError("Polling failed for the cover job this tick");
    return { done: false };
  }

  await settleCoverJob(job, refreshed);
  return { done: true };
}

async function applyCoverVariantResult(job: JobRow, variant: VariantRow, result: CoverVariantResult): Promise<void> {
  const patch = result.providerProductId ? { providerProductId: result.providerProductId } : {};
  if (result.status === "succeeded") {
    if (!result.resultLocation) {
      await variantRepository.update(variant.id, { ...patch, status: VariantStatus.FAILED, rawStatus: result.rawStatus, errorMessage: "Provider reported success but returned no result location" });
      return;
    }
    const input = job.input as CoverInput;
    const asset = await ingestAudioFromLocalPath({
      jobId: job.id,
      variantId: variant.id,
      variantIndex: variant.index,
      projectId: job.projectId,
      sourcePath: result.resultLocation,
      fallbackMimeType: "audio/mpeg",
      durationSeconds: result.durationSeconds,
      source: AssetSource.COVER,
      title: input.title && input.title.length > 0 ? input.title : "Cover",
      lyrics: input.lyrics,
      prompt: input.musicDescription ?? input.style ?? null,
      tags: [],
    });
    await variantRepository.update(variant.id, {
      ...patch,
      status: VariantStatus.SUCCEEDED,
      rawStatus: result.rawStatus,
      durationSeconds: result.durationSeconds,
      progress: 100,
      assetId: asset.id,
    });
    return;
  }
  if (result.status === "failed") {
    await variantRepository.update(variant.id, { ...patch, status: VariantStatus.FAILED, rawStatus: result.rawStatus, errorMessage: result.errorMessage ?? "Generation failed" });
    return;
  }
  if (result.status === "unknown") {
    await variantRepository.update(variant.id, { ...patch, status: VariantStatus.UNKNOWN, rawStatus: result.rawStatus });
    return;
  }
  await variantRepository.update(variant.id, { ...patch, status: VariantStatus.RUNNING, rawStatus: result.rawStatus });
}

/** Cover's billing rule differs from music: if either variant fails, nothing is charged (no partial-success charge). */
async function settleCoverJob(job: JobRow, variantRows: VariantRow[]): Promise<void> {
  const succeeded = variantRows.filter((v) => v.status === VariantStatus.SUCCEEDED);
  const unknown = variantRows.filter((v) => v.status === VariantStatus.UNKNOWN);

  if (unknown.length > 0 && succeeded.length < variantRows.length) {
    await jobRepository.update(job.id, {
      status: JobStatus.RECONCILIATION_REQUIRED,
      errorClass: ErrorClass.POLLING_FAILED,
      errorMessage: "One or more cover variants returned an unknown status; manual reconciliation required",
      completedAt: new Date(),
    });
    return;
  }

  const allSucceeded = succeeded.length === variantRows.length;
  const finalStatus = allSucceeded ? JobStatus.SUCCEEDED : JobStatus.FAILED;
  const chargedCredits = allSucceeded ? Math.ceil(Math.max(...succeeded.map((v) => v.durationSeconds ?? 0))) * CREDITS_PER_SECOND : 0;

  await db.transaction(async (tx) => {
    const charge = await ledgerRepository.insertSettlementCharge(
      {
        jobId: job.id,
        kind: LedgerKind.CHARGE,
        credits: -chargedCredits,
        currency: LedgerCurrency.CREDITS,
        source: LedgerSource.PROVIDER,
        pricingVersion: job.pricingVersion,
        note: "Settled cover charge (either variant fails -> 0 rule)",
        settlementKey: job.id,
      },
      tx
    );
    if (charge === null) return;

    await ledgerRepository.insert(
      {
        jobId: job.id,
        kind: LedgerKind.RESERVATION_RELEASE,
        credits: job.estimateCredits,
        currency: LedgerCurrency.CREDITS,
        source: LedgerSource.APP,
        pricingVersion: job.pricingVersion,
        note: "Reservation released at settlement",
      },
      tx
    );

    await jobRepository.update(
      job.id,
      {
        status: finalStatus,
        chargedCredits,
        completedAt: new Date(),
        errorClass: finalStatus === JobStatus.FAILED ? ErrorClass.GENERATION_FAILED : null,
        errorMessage: finalStatus === JobStatus.FAILED ? "One or both cover variants failed to generate; no charge applied" : null,
      },
      tx
    );
  });
}

// ============================================================================
// SYNC kinds (R2) — lyrics_recognition, sound, speech, emotion_enhance,
// voice_design, voice_clone, transcription. Single worker tick: commit
// submission intent, call the provider once, ingest + settle immediately.
// ============================================================================

interface SyncOutcome {
  result: JobResult | null;
  /** Only meaningful for `credits`-billed kinds (lyrics_recognition). */
  chargedCredits: number | null;
  /** Only meaningful for `usd`-billed kinds. `null` = unknown price (settles usd:null, warning surfaced by usage.service). */
  chargedUsd: string | null;
}

export async function processSyncJobTick(jobId: string, provider: AudioStudioProviderAdapter): Promise<TickResult> {
  const job = await jobRepository.findById(jobId);
  if (!job || (JOB_TERMINAL_STATUSES as readonly string[]).includes(job.status)) {
    return { done: true };
  }

  if (job.status !== JobStatus.QUEUED) {
    // A sync kind only ever spends one tick in SUBMITTING; landing here again
    // means the worker crashed mid-execution. Ambiguous — never auto-retry.
    await markSubmissionUnknown(job, "Worker restarted after committing submission intent but before a synchronous result was recorded");
    return { done: true };
  }

  await jobRepository.update(job.id, { status: JobStatus.SUBMITTING, submittedAt: new Date() });

  try {
    const outcome = await executeSyncKind(job, provider);
    await settleSyncJob(job, outcome);
    return { done: true };
  } catch (error) {
    if (error instanceof ProviderTimeoutError) {
      await markSubmissionUnknown(job, error.message);
      return { done: true };
    }
    if (error instanceof ProviderBusinessError) {
      await failBeforeSubmission(job, error.errorClass, error.message);
      return { done: true };
    }
    // Submission intent is committed and the request may have reached the provider
    // (5xx, malformed body, or a local failure after a paid response). Re-queueing
    // would re-send a paid request, so keep the reservation for reconciliation instead.
    logger.error({ err: error, jobId: job.id }, "Sync job failed after dispatch; outcome unknown");
    await markSubmissionUnknown(job, "The provider outcome could not be confirmed; kept for reconciliation instead of retrying.");
    return { done: true };
  }
}

async function executeSyncKind(job: JobRow, provider: AudioStudioProviderAdapter): Promise<SyncOutcome> {
  const input = job.input as JobInput;

  switch (job.kind) {
    case JobKind.LYRICS_RECOGNITION: {
      const recognitionInput = input as LyricsRecognitionInput;
      const upload = await requireUpload(recognitionInput.uploadId);
      const buffer = await readUploadBytes(upload);
      const recognized = await provider.recognizeLyrics(buffer, upload.mimeType, job.id);
      return {
        result: { kind: "lyrics_recognition", hasVocals: recognized.hasVocals, lyrics: recognized.lyrics },
        chargedCredits: recognized.charged ? LYRICS_RECOGNITION_ESTIMATE_CREDITS : 0,
        chargedUsd: null,
      };
    }

    case JobKind.SOUND: {
      const soundInput = input as SoundInput;
      const existing = (await variantRepository.findByJobId(job.id))[0];
      const audio = await provider.textToSound(soundInput);
      const durationSeconds = audio.durationSeconds > 0 ? audio.durationSeconds : soundInput.durationSeconds;
      const asset = await storeBufferAsAsset({
        jobId: job.id,
        variantId: existing?.id ?? null,
        variantIndex: existing?.index ?? 0,
        projectId: job.projectId,
        buffer: audio.buffer,
        fallbackMimeType: audio.mimeType,
        durationSeconds,
        source: AssetSource.SOUND,
        title: soundInput.prompt.slice(0, 80),
        prompt: soundInput.prompt,
      });
      if (existing) {
        await variantRepository.update(existing.id, { status: VariantStatus.SUCCEEDED, rawStatus: "succeeded", durationSeconds, progress: 100, assetId: asset.id });
      }
      return { result: null, chargedCredits: null, chargedUsd: usdFromNumber(durationSeconds * SOUND_USD_PER_SECOND) };
    }

    case JobKind.SPEECH: {
      const speechInput = input as SpeechInput;
      const voice = await voiceRepository.findById(speechInput.voiceId);
      if (!voice) throw new ProviderBusinessError("Referenced voice was not found", ErrorClass.INVALID_INPUT);
      const existing = (await variantRepository.findByJobId(job.id))[0];
      const audio = await provider.textToSpeech(speechInput, voice.providerVoiceId);
      const durationSeconds = audio.durationSeconds > 0 ? audio.durationSeconds : null;
      const asset = await storeBufferAsAsset({
        jobId: job.id,
        variantId: existing?.id ?? null,
        variantIndex: existing?.index ?? 0,
        projectId: job.projectId,
        buffer: audio.buffer,
        fallbackMimeType: audio.mimeType,
        durationSeconds,
        source: AssetSource.SPEECH,
        title: speechInput.text.slice(0, 80),
      });
      if (existing) {
        await variantRepository.update(existing.id, { status: VariantStatus.SUCCEEDED, rawStatus: "succeeded", durationSeconds, progress: 100, assetId: asset.id });
      }
      return { result: null, chargedCredits: null, chargedUsd: job.estimateUsd };
    }

    case JobKind.EMOTION_ENHANCE: {
      const enhanced = await provider.emotionEnhance(input as EmotionInput);
      return { result: { kind: "emotion_enhance", text: enhanced.text }, chargedCredits: null, chargedUsd: null };
    }

    case JobKind.VOICE_DESIGN: {
      const designInput = input as VoiceDesignInput;
      const designed = await provider.voiceDesign(designInput);
      const voiceIds: string[] = [];

      for (let index = 0; index < designed.previews.length; index += 1) {
        const preview = designed.previews[index];
        if (!preview) continue;
        const mimeType = sniffAudioMime(preview.audioBuffer) ?? "audio/wav";
        const { storageKey } = await storageService.storeBuffer(preview.audioBuffer, mimeType);
        const durationSeconds = await probeAudioDurationSeconds(storageService.absolutePath(storageKey)).catch(() => null);
        const name = designInput.name ? `${designInput.name} ${index + 1}` : `Designed voice ${index + 1}`;
        const voiceRow = await voiceRepository.insert({
          providerVoiceId: preview.providerVoiceId,
          name,
          type: VoiceType.DESIGNED,
          labels: designed.features ? JSON.stringify(designed.features) : null,
          language: designed.features?.language ?? null,
          previewStorageKey: storageKey,
          previewMimeType: mimeType,
          deletionStatus: VoiceDeletionStatus.ACTIVE,
        });
        voiceIds.push(voiceRow.id);

        const asset = await assetRepository.insert({
          kind: "audio",
          source: AssetSource.VOICE_PREVIEW,
          title: name,
          jobId: job.id,
          variantId: null,
          variantIndex: index,
          projectId: job.projectId,
          storageKey,
          mimeType,
          bytes: preview.audioBuffer.byteLength,
          durationSeconds,
          tags: [],
        });
        await variantRepository.insertMany([
          { jobId: job.id, index, status: VariantStatus.SUCCEEDED, assetId: asset.id, durationSeconds, rawStatus: "succeeded", progress: 100 },
        ]);
      }

      return {
        result: { kind: "voice_design", voiceIds, features: designed.features },
        chargedCredits: null,
        chargedUsd: job.estimateUsd,
      };
    }

    case JobKind.VOICE_CLONE: {
      const cloneInput = input as VoiceCloneInput;
      const upload = await requireUpload(cloneInput.uploadId);
      const buffer = await readUploadBytes(upload);
      const cloned = await provider.cloneVoice(cloneInput, buffer, upload.mimeType);

      const voiceRow = await voiceRepository.insert({
        providerVoiceId: cloned.providerVoiceId,
        name: cloneInput.name,
        type: VoiceType.CUSTOM,
        labels: null,
        language: cloneInput.language ?? null,
        permissionConfirmedAt: new Date(),
        deletionStatus: VoiceDeletionStatus.ACTIVE,
      });

      if (cloned.previewBuffer) {
        const mimeType = sniffAudioMime(cloned.previewBuffer) ?? "audio/wav";
        const { storageKey } = await storageService.storeBuffer(cloned.previewBuffer, mimeType);
        await voiceRepository.update(voiceRow.id, { previewStorageKey: storageKey, previewMimeType: mimeType });
      }

      return { result: { kind: "voice_clone", voiceId: voiceRow.id }, chargedCredits: null, chargedUsd: null };
    }

    case JobKind.TRANSCRIPTION: {
      const transcriptionInput = input as TranscriptionInput;
      const upload = await requireUpload(transcriptionInput.uploadId);
      const buffer = await readUploadBytes(upload);
      const transcribed = await provider.transcribe(transcriptionInput, buffer, upload.mimeType, upload.durationSeconds ?? 0);
      return {
        result: {
          kind: "transcription",
          language: transcribed.language,
          transcript: transcribed.transcript,
          durationSeconds: transcribed.durationSeconds,
          segments: transcribed.segments,
        },
        chargedCredits: null,
        chargedUsd: job.estimateUsd,
      };
    }

    default:
      throw new Error(`processSyncJobTick called for a non-sync kind: ${job.kind}`);
  }
}

async function settleSyncJob(job: JobRow, outcome: SyncOutcome): Promise<void> {
  await db.transaction(async (tx) => {
    if (job.billing === BillingGroup.CREDITS) {
      const chargedCredits = outcome.chargedCredits ?? 0;
      const charge = await ledgerRepository.insertSettlementCharge(
        {
          jobId: job.id,
          kind: LedgerKind.CHARGE,
          credits: -chargedCredits,
          currency: LedgerCurrency.CREDITS,
          source: LedgerSource.PROVIDER,
          pricingVersion: job.pricingVersion,
          note: "Settled charge",
          settlementKey: job.id,
        },
        tx
      );
      if (charge === null) return;

      await ledgerRepository.insert(
        {
          jobId: job.id,
          kind: LedgerKind.RESERVATION_RELEASE,
          credits: job.estimateCredits,
          currency: LedgerCurrency.CREDITS,
          source: LedgerSource.APP,
          pricingVersion: job.pricingVersion,
          note: "Reservation released at settlement",
        },
        tx
      );

      await jobRepository.update(job.id, { status: JobStatus.SUCCEEDED, chargedCredits, result: outcome.result, completedAt: new Date() }, tx);
      return;
    }

    const chargedUsd = outcome.chargedUsd;
    const charge = await ledgerRepository.insertSettlementCharge(
      {
        jobId: job.id,
        kind: LedgerKind.CHARGE,
        credits: 0,
        usdEstimate: negateUsd(chargedUsd ?? "0"),
        currency: LedgerCurrency.USD,
        source: LedgerSource.PROVIDER,
        pricingVersion: job.pricingVersion,
        note: chargedUsd === null ? "Settled with unknown provider price; pending manual reconciliation" : "Settled charge",
        settlementKey: job.id,
      },
      tx
    );
    if (charge === null) return;

    await ledgerRepository.insert(
      {
        jobId: job.id,
        kind: LedgerKind.RESERVATION_RELEASE,
        credits: 0,
        usdEstimate: job.estimateUsd,
        currency: LedgerCurrency.USD,
        source: LedgerSource.APP,
        pricingVersion: job.pricingVersion,
        note: "USD reservation released at settlement",
      },
      tx
    );

    await jobRepository.update(job.id, { status: JobStatus.SUCCEEDED, chargedUsd, result: outcome.result, completedAt: new Date() }, tx);
  });
}
