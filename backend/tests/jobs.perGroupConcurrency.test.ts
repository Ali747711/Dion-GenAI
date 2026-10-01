import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";
import { validMusicInput, validSoundInput } from "./helpers/fixtures";

describe("per-billing-group concurrency (R2): 1 in-flight credits job AND 1 in-flight usd job may coexist", () => {
  it("allows a credits job and a usd job to be in flight at the same time", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    await agent.patch("/api/v1/budget").set("X-CSRF-Token", csrfToken).send({ usdMonthlyCap: "5.00" }).expect(200);

    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(202);

    // A second `music` (credits) job is still blocked (unchanged R1 rule)...
    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: validMusicInput() })
      .expect(409);

    // ...but a `sound` (usd) job is a different billing group, so it's accepted.
    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "sound", idempotencyKey: randomUUID(), input: validSoundInput() })
      .expect(202);

    // And now a second `sound` job is blocked, within its own group.
    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "sound", idempotencyKey: randomUUID(), input: validSoundInput() })
      .expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});
