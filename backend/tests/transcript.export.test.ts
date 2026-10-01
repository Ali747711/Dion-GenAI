import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { JobKind } from "../src/libs/enums/job.enum";
import { budgetRepository } from "../src/repositories/budget.repository";
import { jobService } from "../src/services/job.service";
import { processSyncJobTick } from "../src/worker/jobProcessor";
import { buildTestApp, loginAgent } from "./helpers/app";
import { FakeAudioStudioProvider } from "./helpers/fakeAudioStudioProvider";
import { validMusicInput, validTranscriptionInput } from "./helpers/fixtures";
import { insertTestUpload } from "./helpers/uploads";

async function createSucceededTranscriptionJob() {
  await budgetRepository.update({ usdMonthlyCap: "5.00" });
  const provider = new FakeAudioStudioProvider();
  provider.transcribeResult = {
    language: "en",
    transcript: "Hello world. This is a test.",
    segments: [
      { text: "Hello world.", start: 0, end: 1.5, speaker: 0 },
      { text: "This is a test.", start: 1.5, end: 3, speaker: 1 },
    ],
  };
  const upload = await insertTestUpload("transcription", { durationSeconds: 3 });
  const outcome = await jobService.createJob({ kind: JobKind.TRANSCRIPTION, idempotencyKey: randomUUID(), input: validTranscriptionInput(upload.id) });
  await processSyncJobTick(outcome.job.id, provider);
  return outcome.job.id;
}

describe("GET /api/v1/jobs/:id/transcript", () => {
  it("exports txt", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const jobId = await createSucceededTranscriptionJob();

    const res = await agent.get(`/api/v1/jobs/${jobId}/transcript?format=txt`).expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    expect(res.text).toBe("Hello world. This is a test.");
  });

  it("exports srt with correctly formatted timestamps", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const jobId = await createSucceededTranscriptionJob();

    const res = await agent.get(`/api/v1/jobs/${jobId}/transcript?format=srt`).expect(200);
    expect(res.text).toContain("00:00:00,000 --> 00:00:01,500");
    expect(res.text).toContain("Hello world.");
    expect(res.text).toContain("00:00:01,500 --> 00:00:03,000");
  });

  it("exports json with full structured segments", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const jobId = await createSucceededTranscriptionJob();

    const res = await agent.get(`/api/v1/jobs/${jobId}/transcript?format=json`).expect(200);
    const parsed = JSON.parse(res.text);
    expect(parsed.kind).toBe("transcription");
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[1].speaker).toBe(1);
  });

  it("returns 409 CONFLICT for a job that is not a succeeded transcription", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const created = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(202);

    const res = await agent.get(`/api/v1/jobs/${created.body.data.id}/transcript`).expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});
