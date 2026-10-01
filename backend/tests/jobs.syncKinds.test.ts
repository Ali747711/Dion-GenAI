import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { JobKind, JobStatus } from "../src/libs/enums/job.enum";
import { assetRepository } from "../src/repositories/asset.repository";
import { budgetRepository } from "../src/repositories/budget.repository";
import { ledgerRepository } from "../src/repositories/ledger.repository";
import { voiceRepository } from "../src/repositories/voice.repository";
import { jobService } from "../src/services/job.service";
import { usageService } from "../src/services/usage.service";
import { ProviderTransientError } from "../src/services/provider/provider.types";
import { processSyncJobTick } from "../src/worker/jobProcessor";
import { FakeAudioStudioProvider } from "./helpers/fakeAudioStudioProvider";
import {
  validEmotionInput,
  validLyricsRecognitionInput,
  validSoundInput,
  validSpeechInput,
  validVoiceCloneInput,
  validVoiceDesignInput,
} from "./helpers/fixtures";
import { insertTestUpload } from "./helpers/uploads";

beforeEach(async () => {
  // USD kinds are unavailable while the cap is unset (default "0.00" in the test fixture) —
  // set a working cap so these tests can exercise USD reservation/settlement.
  await budgetRepository.update({ usdMonthlyCap: "5.00" });
});

describe("lyrics_recognition: charges only when the provider reports charged=true", () => {
  it("charges 100 credits when charged=true", async () => {
    const provider = new FakeAudioStudioProvider();
    provider.recognizeResult = { hasVocals: true, lyrics: "some lyrics", charged: true };
    const upload = await insertTestUpload("cover_source");

    const outcome = await jobService.createJob({ kind: JobKind.LYRICS_RECOGNITION, idempotencyKey: randomUUID(), input: validLyricsRecognitionInput(upload.id) });
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedCredits).toBe(100);
    expect(job.result).toEqual({ kind: "lyrics_recognition", hasVocals: true, lyrics: "some lyrics" });
  });

  it("charges 0 credits (and releases the reservation) when charged=false", async () => {
    const provider = new FakeAudioStudioProvider();
    provider.recognizeResult = { hasVocals: false, lyrics: "", charged: false };
    const upload = await insertTestUpload("cover_source");

    const outcome = await jobService.createJob({ kind: JobKind.LYRICS_RECOGNITION, idempotencyKey: randomUUID(), input: validLyricsRecognitionInput(upload.id) });
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedCredits).toBe(0);
  });
});

describe("sound: settles USD based on the actual generated duration and produces a playable asset", () => {
  it("charges $0.001/s and creates a single sound asset", async () => {
    const provider = new FakeAudioStudioProvider();
    const outcome = await jobService.createJob({ kind: JobKind.SOUND, idempotencyKey: randomUUID(), input: validSoundInput({ durationSeconds: 5 }) });
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedUsd).toBe("0.005000");
    expect(job.variants).toHaveLength(1);
    expect(job.variants[0]?.assetId).toBeTruthy();

    const asset = await assetRepository.findById(job.variants[0]!.assetId!);
    expect(asset?.mimeType).toBe("audio/wav");
    expect(asset?.source).toBe("sound");
  });
});

describe("speech: settles USD deterministically from char count (no variance)", () => {
  it("charges the same amount reserved at creation", async () => {
    const provider = new FakeAudioStudioProvider();
    const voice = await voiceRepository.insert({ providerVoiceId: "fake_builtin_1", name: "Fake Voice", type: "built-in", deletionStatus: "active" });

    const outcome = await jobService.createJob({ kind: JobKind.SPEECH, idempotencyKey: randomUUID(), input: validSpeechInput(voice.id) });
    const estimateBefore = outcome.job.estimateUsd;
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedUsd).toBe(estimateBefore);
  });
});

describe("sync kinds never re-send a paid request after dispatch", () => {
  it("marks submission_unknown (reservation kept) instead of re-queueing on a post-dispatch failure", async () => {
    const provider = new FakeAudioStudioProvider();
    let calls = 0;
    provider.textToSpeech = async () => {
      calls += 1;
      throw new ProviderTransientError("Unexpected provider response: no audio bytes were returned");
    };
    const voice = await voiceRepository.insert({ providerVoiceId: "fake_builtin_1", name: "Fake Voice", type: "built-in", deletionStatus: "active" });

    const outcome = await jobService.createJob({ kind: JobKind.SPEECH, idempotencyKey: randomUUID(), input: validSpeechInput(voice.id) });
    await processSyncJobTick(outcome.job.id, provider);
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUBMISSION_UNKNOWN);
    expect(calls).toBe(1);
    expect(job.chargedUsd).toBeNull();
    expect(job.variants.every((variant) => variant.assetId === null)).toBe(true);
  });
});

describe("unknown-price kinds settle usd:null and surface a pending_reconciliation warning", () => {
  it("emotion_enhance settles with chargedUsd null", async () => {
    const provider = new FakeAudioStudioProvider();
    const outcome = await jobService.createJob({ kind: JobKind.EMOTION_ENHANCE, idempotencyKey: randomUUID(), input: validEmotionInput() });
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedUsd).toBeNull();
    expect(job.result).toEqual({ kind: "emotion_enhance", text: provider.emotionText });

    const usage = await usageService.getUsage();
    expect(usage.warnings).toContain("pending_reconciliation");
  });

  it("voice_clone settles with chargedUsd null and creates a custom voice", async () => {
    const provider = new FakeAudioStudioProvider();
    const upload = await insertTestUpload("voice_sample", { durationSeconds: 10 });
    const outcome = await jobService.createJob({ kind: JobKind.VOICE_CLONE, idempotencyKey: randomUUID(), input: validVoiceCloneInput(upload.id) });
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedUsd).toBeNull();
    expect(job.result?.kind).toBe("voice_clone");

    const voiceId = (job.result as { voiceId: string }).voiceId;
    const voice = await voiceRepository.findById(voiceId);
    expect(voice?.type).toBe("custom");
    expect(voice?.providerVoiceId).toBe(provider.clonedVoiceId);
  });
});

describe("voice_design: settles the flat fee and creates one voice + asset per preview", () => {
  it("creates 2 designed voices with linked preview assets", async () => {
    const provider = new FakeAudioStudioProvider();
    provider.voiceDesignPreviewCount = 2;
    const outcome = await jobService.createJob({ kind: JobKind.VOICE_DESIGN, idempotencyKey: randomUUID(), input: validVoiceDesignInput() });
    await processSyncJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedUsd).toBe("0.300000");
    expect(job.variants).toHaveLength(2);

    const result = job.result as { voiceIds: string[] };
    expect(result.voiceIds).toHaveLength(2);
    for (const voiceId of result.voiceIds) {
      const voice = await voiceRepository.findById(voiceId);
      expect(voice?.type).toBe("designed");
      expect(voice?.previewStorageKey).toBeTruthy();
    }
  });
});

describe("settlement is exactly-once per job across repeated ticks", () => {
  it("a second tick on an already-terminal sync job is a no-op (never double-charges)", async () => {
    const provider = new FakeAudioStudioProvider();
    const outcome = await jobService.createJob({ kind: JobKind.SOUND, idempotencyKey: randomUUID(), input: validSoundInput({ durationSeconds: 2 }) });
    await processSyncJobTick(outcome.job.id, provider);
    const secondTick = await processSyncJobTick(outcome.job.id, provider);

    expect(secondTick.done).toBe(true);
    const charges = (await ledgerRepository.findMany(null, 100)).filter((row) => row.jobId === outcome.job.id && row.kind === "charge");
    expect(charges).toHaveLength(1);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
  });
});
