import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { JOB_TERMINAL_STATUSES } from "../src/libs/configs";
import { ErrorClass, JobKind, JobStatus } from "../src/libs/enums/job.enum";
import { jobService } from "../src/services/job.service";
import { setMusicProviderForTests } from "../src/services/provider/provider.factory";
import { processJobTick } from "../src/worker/jobProcessor";
import { FakeProvider } from "./helpers/fakeProvider";
import { validMusicInput } from "./helpers/fixtures";

afterEach(() => {
  setMusicProviderForTests(null);
});

describe("submission_unknown", () => {
  it("marks the job submission_unknown and keeps the reservation open on a submit timeout", async () => {
    const provider = new FakeProvider();
    provider.submitBehavior = "timeout";
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    const result = await processJobTick(outcome.job.id, provider);
    expect(result.done).toBe(true);

    const job = await jobService.getJob(outcome.job.id);
    expect(job.status).toBe(JobStatus.SUBMISSION_UNKNOWN);
    expect(job.errorClass).toBe(ErrorClass.AMBIGUOUS_SUBMISSION);
    expect((JOB_TERMINAL_STATUSES as readonly string[]).includes(job.status)).toBe(true);

    // The reservation is NOT released: it still counts as pending in usage.
    const usage = await import("../src/services/usage.service").then((m) => m.usageService.getUsage());
    expect(usage.pendingCredits).toBe(job.estimateCredits);
    expect(usage.warnings).toContain("pending_reconciliation");
  });

  it("never auto-retries a submission_unknown job: another tick is a no-op", async () => {
    const provider = new FakeProvider();
    provider.submitBehavior = "timeout";
    setMusicProviderForTests(provider);

    const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
    await processJobTick(outcome.job.id, provider);
    expect(provider.submitCalls).toBe(1);

    const secondTick = await processJobTick(outcome.job.id, provider);
    expect(secondTick.done).toBe(true);
    expect(provider.submitCalls).toBe(1); // no additional submit call was made
  });
});
