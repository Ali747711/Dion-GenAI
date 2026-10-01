import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { JobKind, JobStatus } from "../src/libs/enums/job.enum";
import { assetRepository } from "../src/repositories/asset.repository";
import { jobService } from "../src/services/job.service";
import { setMusicProviderForTests } from "../src/services/provider/provider.factory";
import { ProviderTransientError } from "../src/services/provider/provider.types";
import * as safeFetchModule from "../src/services/safeFetch.service";
import { processJobTick } from "../src/worker/jobProcessor";
import { FakeProvider } from "./helpers/fakeProvider";
import { FIXTURE_AUDIO_PATH, validMusicInput } from "./helpers/fixtures";

const REMOTE_URL = "https://storage.googleapis.com/noiz/result.mp3";

afterEach(() => {
  setMusicProviderForTests(null);
  vi.restoreAllMocks();
});

// Live providers return https result URLs, not local paths; results must be downloaded, not fs-copied.
describe("remote result ingestion", () => {
  it("downloads https results through safeFetch and stores them as assets", async () => {
    const buffer = await fs.readFile(FIXTURE_AUDIO_PATH);
    const fetchSpy = vi.spyOn(safeFetchModule, "safeFetch").mockResolvedValue({ buffer, contentType: "audio/mpeg" });
    const provider = new FakeProvider();
    provider.pollScripts = {
      0: [{ status: "succeeded", durationSeconds: 20, resultLocation: REMOTE_URL }],
      1: [{ status: "succeeded", durationSeconds: 21, resultLocation: REMOTE_URL }],
    };
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider);
    await processJobTick(outcome.job.id, provider);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(fetchSpy).toHaveBeenCalledWith(REMOTE_URL, expect.any(Object));
    const assetId = job.variants[0]?.assetId;
    expect(assetId).toBeTruthy();
    const asset = await assetRepository.findById(assetId ?? "");
    expect(asset?.bytes).toBe(buffer.length);
  });

  it("treats a failed download as transient without resubmitting the generation", async () => {
    vi.spyOn(safeFetchModule, "safeFetch").mockRejectedValue(new Error("network down"));
    const provider = new FakeProvider();
    provider.pollScripts = {
      0: [{ status: "succeeded", durationSeconds: 20, resultLocation: REMOTE_URL }],
      1: [{ status: "succeeded", durationSeconds: 21, resultLocation: REMOTE_URL }],
    };
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider);
    await expect(processJobTick(outcome.job.id, provider)).rejects.toBeInstanceOf(ProviderTransientError);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).not.toBe(JobStatus.SUCCEEDED);
    expect(job.providerTaskId ?? job.variants[0]?.providerProductId).toBeTruthy();
  });
});
