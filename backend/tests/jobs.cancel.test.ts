import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";
import { validMusicInput } from "./helpers/fixtures";

describe("job cancellation", () => {
  it("cancels a queued job, releases the reservation, and reflects it in usage", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const created = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(202);

    const jobId = created.body.data.id;

    const usageBefore = await agent.get("/api/v1/usage").expect(200);
    expect(usageBefore.body.data.pendingCredits).toBe(2700);

    const cancelled = await agent.post(`/api/v1/jobs/${jobId}/cancel`).set("X-CSRF-Token", csrfToken).expect(200);
    expect(cancelled.body.data.status).toBe("cancelled_before_submission");

    const usageAfter = await agent.get("/api/v1/usage").expect(200);
    expect(usageAfter.body.data.pendingCredits).toBe(0);
  });

  it("returns 409 CONFLICT when cancelling a job that is no longer queued", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const created = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(202);
    const jobId = created.body.data.id;

    await agent.post(`/api/v1/jobs/${jobId}/cancel`).set("X-CSRF-Token", csrfToken).expect(200);

    const secondCancel = await agent.post(`/api/v1/jobs/${jobId}/cancel`).set("X-CSRF-Token", csrfToken).expect(409);
    expect(secondCancel.body.error.code).toBe("CONFLICT");
  });

  it("returns 404 NOT_FOUND for cancelling an unknown job id", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent.post(`/api/v1/jobs/${randomUUID()}/cancel`).set("X-CSRF-Token", csrfToken).expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
