import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";
import { validSoundInput } from "./helpers/fixtures";

describe("USD PAYGO cap gating", () => {
  it("POST /estimates returns 409 CAPABILITY_UNAVAILABLE for a USD kind while the cap is unset (0.00)", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent
      .post("/api/v1/estimates")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "sound", input: validSoundInput() })
      .expect(409);

    expect(res.body.error.code).toBe("CAPABILITY_UNAVAILABLE");
  });

  it("POST /jobs returns 409 CAPABILITY_UNAVAILABLE for a USD kind while the cap is unset", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "sound", idempotencyKey: randomUUID(), input: validSoundInput() })
      .expect(409);

    expect(res.body.error.code).toBe("CAPABILITY_UNAVAILABLE");
  });

  it("GET /capabilities reports sound/speech/voices/transcribe unavailable while the cap is unset", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const res = await agent.get("/api/v1/capabilities").expect(200);
    const byKey = Object.fromEntries(res.body.data.map((c: { key: string; available: boolean }) => [c.key, c.available]));
    expect(byKey.sound).toBe(false);
    expect(byKey.speech).toBe(false);
    expect(byKey.voices).toBe(false);
    expect(byKey.transcribe).toBe(false);
    expect(byKey.cover).toBe(true);
    expect(byKey.music).toBe(true);
  });

  it("allows job creation once a cap is set, and reports capabilities available", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ usdMonthlyCap: "5.00" }).expect(200);

    const capRes = await agent.get("/api/v1/capabilities").expect(200);
    const byKey = Object.fromEntries(capRes.body.data.map((c: { key: string; available: boolean }) => [c.key, c.available]));
    expect(byKey.sound).toBe(true);

    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "sound", idempotencyKey: randomUUID(), input: validSoundInput({ durationSeconds: 5 }) })
      .expect(202);
  });

  it("returns 409 INSUFFICIENT_BUDGET when the estimate exceeds the remaining monthly cap", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    // $0.001/s * 30s = $0.03; a cap of $0.01 cannot cover it.
    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ usdMonthlyCap: "0.01" }).expect(200);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "sound", idempotencyKey: randomUUID(), input: validSoundInput({ durationSeconds: 30 }) })
      .expect(409);

    expect(res.body.error.code).toBe("INSUFFICIENT_BUDGET");
  });

  it("prevents oversubscription: concurrent USD job submits reserve exactly once", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ usdMonthlyCap: "5.00" }).expect(200);

    const attempts = Array.from({ length: 5 }, () =>
      agent
        .post("/api/v1/jobs")
        .set("X-CSRF-Token", csrfToken)
        .send({ kind: "sound", idempotencyKey: randomUUID(), input: validSoundInput({ durationSeconds: 5 }) })
    );

    const results = await Promise.all(attempts);
    const accepted = results.filter((r) => r.status === 202);
    const conflicted = results.filter((r) => r.status === 409);

    expect(accepted).toHaveLength(1);
    expect(conflicted).toHaveLength(4);
    for (const r of conflicted) expect(r.body.error.code).toBe("CONFLICT");

    const usage = await agent.get("/api/v1/usage").expect(200);
    expect(usage.body.data.usd.pending).toBe("0.005000");
  });
});
