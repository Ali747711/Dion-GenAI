import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";
import { validMusicInput } from "./helpers/fixtures";

describe("job creation idempotency", () => {
  it("returns the same job (200) on a duplicate idempotencyKey with the same payload", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const idempotencyKey = randomUUID();
    const body = { kind: "music", idempotencyKey, input: validMusicInput() };

    const first = await agent.post("/api/v1/jobs").set("X-CSRF-Token", csrfToken).send(body).expect(202);
    const second = await agent.post("/api/v1/jobs").set("X-CSRF-Token", csrfToken).send(body).expect(200);

    expect(second.body.data.id).toBe(first.body.data.id);

    const list = await agent.get("/api/v1/jobs").expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  it("returns 409 CONFLICT when the same idempotencyKey is reused with a different payload", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const idempotencyKey = randomUUID();

    await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey, input: validMusicInput() })
      .expect(202);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey, input: validMusicInput({ prompt: "A completely different prompt about mountains" }) })
      .expect(409);

    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects an invalid idempotencyKey (not a uuid) with 400 VALIDATION_FAILED", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: "not-a-uuid", input: validMusicInput() })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("idempotencyKey");
  });

  it("rejects music input missing lyrics when lyricsMode is 'lyrics'", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent
      .post("/api/v1/jobs")
      .set("X-CSRF-Token", csrfToken)
      .send({ kind: "music", idempotencyKey: randomUUID(), input: { prompt: "A song", lyricsMode: "lyrics" } })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("input.lyrics");
  });
});
