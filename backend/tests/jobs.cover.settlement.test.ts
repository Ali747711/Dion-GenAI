import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { JobKind, JobStatus } from "../src/libs/enums/job.enum";
import { jobService } from "../src/services/job.service";
import { processCoverJobTick } from "../src/worker/jobProcessor";
import { FakeAudioStudioProvider } from "./helpers/fakeAudioStudioProvider";
import { validCoverInput } from "./helpers/fixtures";
import { insertTestUpload } from "./helpers/uploads";

async function createCoverJob(provider: FakeAudioStudioProvider) {
  const upload = await insertTestUpload("cover_source");
  const outcome = await jobService.createJob({ kind: JobKind.COVER, idempotencyKey: randomUUID(), input: validCoverInput(upload.id) });
  await processCoverJobTick(outcome.job.id, provider); // submit
  return outcome.job.id;
}

describe("cover settlement (either variant fails -> 0, unlike music's partial charge)", () => {
  it("charges ceil(longest duration) x 15 when both variants succeed", async () => {
    const provider = new FakeAudioStudioProvider();
    provider.coverPollScripts = {
      0: [{ status: "succeeded", durationSeconds: 20.2 }],
      1: [{ status: "succeeded", durationSeconds: 35.1 }],
    };

    const jobId = await createCoverJob(provider);
    await processCoverJobTick(jobId, provider); // poll -> both succeed -> settle

    const job = await jobService.getJob(jobId);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedCredits).toBe(540); // ceil(35.1) * 15
  });

  it("charges nothing and marks failed when either variant fails", async () => {
    const provider = new FakeAudioStudioProvider();
    provider.coverPollScripts = {
      0: [{ status: "succeeded", durationSeconds: 20.2 }],
      1: [{ status: "failed" }],
    };

    const jobId = await createCoverJob(provider);
    await processCoverJobTick(jobId, provider);

    const job = await jobService.getJob(jobId);
    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.chargedCredits).toBe(0);
  });

  it("never double-settles across repeated poll ticks", async () => {
    const provider = new FakeAudioStudioProvider();
    provider.coverPollScripts = {
      0: [{ status: "succeeded", durationSeconds: 10 }],
      1: [{ status: "succeeded", durationSeconds: 12 }],
    };

    const jobId = await createCoverJob(provider);
    await processCoverJobTick(jobId, provider);
    await processCoverJobTick(jobId, provider);
    await processCoverJobTick(jobId, provider);

    const job = await jobService.getJob(jobId);
    expect(job.status).toBe(JobStatus.SUCCEEDED);
    expect(job.chargedCredits).toBe(180); // ceil(12) * 15
  });
});
