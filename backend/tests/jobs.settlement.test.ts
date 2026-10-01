import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { JobKind, JobStatus, LedgerKind } from "../src/libs/enums/job.enum";
import { jobService } from "../src/services/job.service";
import { ledgerRepository } from "../src/repositories/ledger.repository";
import { setMusicProviderForTests } from "../src/services/provider/provider.factory";
import { processJobTick } from "../src/worker/jobProcessor";
import { ProviderTransientError } from "../src/services/provider/provider.types";
import { FakeProvider } from "./helpers/fakeProvider";
import { FIXTURE_AUDIO_PATH, validMusicInput } from "./helpers/fixtures";

afterEach(() => {
  setMusicProviderForTests(null);
});

async function chargeEntriesFor(jobId: string) {
  const all = await ledgerRepository.findMany(null, 100);
  return all.filter((row) => row.jobId === jobId && row.kind === LedgerKind.CHARGE);
}

describe("settlement", () => {
  it("charges once based on the longer variant's duration and never double-settles on repeated polling", async () => {
    const provider = new FakeProvider();
    provider.pollScripts = {
      0: [{ status: "succeeded", durationSeconds: 20.2, resultLocation: FIXTURE_AUDIO_PATH }],
      1: [{ status: "succeeded", durationSeconds: 35.1, resultLocation: FIXTURE_AUDIO_PATH }],
    };
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider); // submit
    await processJobTick(outcome.job.id, provider); // poll -> succeeded, settles

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    // ceil(35.1) * 15 = 36 * 15 = 540
    expect(job.chargedCredits).toBe(540);

    const chargesAfterFirstSettle = await chargeEntriesFor(outcome.job.id);
    expect(chargesAfterFirstSettle).toHaveLength(1);

    // Simulate extra, redundant poll ticks after the job is already terminal.
    await processJobTick(outcome.job.id, provider);
    await processJobTick(outcome.job.id, provider);

    const chargesAfterExtraTicks = await chargeEntriesFor(outcome.job.id);
    expect(chargesAfterExtraTicks).toHaveLength(1);

    const jobAfter = await jobService.getJob(outcome.job.id);
    expect(jobAfter.chargedCredits).toBe(540);
  });

  it("marks partially_succeeded and charges based on the succeeding variant when the other fails", async () => {
    const provider = new FakeProvider();
    provider.pollScripts = {
      0: [{ status: "succeeded", durationSeconds: 18.4, resultLocation: FIXTURE_AUDIO_PATH }],
      1: [{ status: "failed", errorMessage: "Generation failed for variant B" }],
    };
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider);
    await processJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.PARTIALLY_SUCCEEDED);
    expect(job.chargedCredits).toBe(19 * 15); // ceil(18.4) * 15
  });

  it("marks failed with no charge and releases the full reservation when both variants fail", async () => {
    const provider = new FakeProvider();
    provider.pollScripts = {
      0: [{ status: "failed", errorMessage: "boom" }],
      1: [{ status: "failed", errorMessage: "boom" }],
    };
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider);
    await processJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.chargedCredits).toBe(0);

    const releases = (await ledgerRepository.findMany(null, 100)).filter(
      (row) => row.jobId === outcome.job.id && row.kind === LedgerKind.RESERVATION_RELEASE
    );
    expect(releases).toHaveLength(1);
    expect(releases[0]?.credits).toBe(job.estimateCredits);
  });

  it("fails before submission (no charge) when the provider reports a business error on submit", async () => {
    const provider = new FakeProvider();
    provider.submitBehavior = "business_error";
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.errorClass).toBe("invalid_credentials");
    expect(job.chargedCredits).toBeNull();
  });

  it("reverts to queued and rethrows on a transient submission error, so a retry can happen safely", async () => {
    const provider = new FakeProvider();
    provider.submitBehavior = "transient_error";
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await expect(processJobTick(outcome.job.id, provider)).rejects.toBeInstanceOf(ProviderTransientError);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.QUEUED);
  });
});
