import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";
import { validMusicInput } from "./helpers/fixtures";

describe("job concurrency and reservation safety", () => {
  it("rejects a second job with 409 CONFLICT while one is already in flight", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(202);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(409);

    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("allows exactly one concurrent submission to succeed and reserves budget only once", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const attempts = Array.from({ length: 5 }, () =>
      agent
        .post("/api/v1/jobs")
        .set("X-CSRF-Token", csrfToken)
        .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
    );

    const results = await Promise.all(attempts);
    const accepted = results.filter((r) => r.status === 202);
    const conflicted = results.filter((r) => r.status === 409);

    expect(accepted).toHaveLength(1);
    expect(conflicted).toHaveLength(4);
    for (const r of conflicted) expect(r.body.error.code).toBe("CONFLICT");

    const usage = await agent.get("/api/v1/usage").expect(200);
    // Exactly one reservation (2700 credits) should be open, never five.
    expect(usage.body.data.pendingCredits).toBe(2700);
  });
});
