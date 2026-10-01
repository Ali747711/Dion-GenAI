import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";
import { validMusicInput } from "./helpers/fixtures";

describe("insufficient budget", () => {
  it("returns 409 INSUFFICIENT_BUDGET when the reserve leaves too little to cover the estimate", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    // startingAllocation(100000) - reserveCredits(98000) = 2000 available, less than the 2700 estimate.
    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ reserveCredits: 98_000 }).expect(200);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(409);

    expect(res.body.error.code).toBe("INSUFFICIENT_BUDGET");
  });

  it("allows job creation again once the budget is restored", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ reserveCredits: 98_000 }).expect(200);
    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(409);

    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ reserveCredits: 10_000 }).expect(200);
    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(202);
  });
});
