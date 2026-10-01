import { describe, expect, it } from "vitest";

import { writeSineWav } from "../src/libs/utils/wavWriter";
import { buildTestApp, loginAgent } from "./helpers/app";

describe("POST /api/v1/uploads", () => {
  it("accepts a valid WAV upload and detects its real MIME type + duration", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const buffer = writeSineWav(3);

    const res = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "voice_sample")
      .attach("file", buffer, { filename: "sample.wav", contentType: "audio/wav" })
      .expect(201);

    expect(res.body.data.mimeType).toBe("audio/wav");
    expect(res.body.data.purpose).toBe("voice_sample");
    expect(res.body.data.durationSeconds).toBeCloseTo(3, 1);
    expect(res.body.data.expiresAt).toBeTruthy();
  });

  it("rejects a file whose bytes don't match any supported audio format (bad magic bytes)", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const garbage = Buffer.from(Array.from({ length: 200 }, (_, i) => i % 256));

    const res = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "voice_sample")
      .attach("file", garbage, { filename: "not-audio.bin", contentType: "application/octet-stream" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("file");
  });

  it("rejects a file exceeding the purpose's max size", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    // voice_sample's limit is 20MB; this is deliberately over it.
    const oversized = Buffer.alloc(21 * 1024 * 1024, 0);

    const res = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "voice_sample")
      .attach("file", oversized, { filename: "big.wav", contentType: "audio/wav" })
      .expect(413);

    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  }, 20000);

  it("rejects audio exceeding the purpose's max duration", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    // voice_sample's max duration is 60s.
    const tooLong = writeSineWav(65);

    const res = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "voice_sample")
      .attach("file", tooLong, { filename: "long.wav", contentType: "audio/wav" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("file");
  });

  it("rejects an unsupported/missing purpose value", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const buffer = writeSineWav(2);

    const res = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "not_a_real_purpose")
      .attach("file", buffer, { filename: "sample.wav", contentType: "audio/wav" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("purpose");
  });

  it("rejects a file whose type isn't allowed for the given purpose", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    // A WAV file is not in the (hypothetical) allowed set here only if we pick a purpose that excludes it;
    // all three purposes accept wav, so instead assert a flac file is rejected for voice_sample (wav/mp3/m4a only).
    const flacHeader = Buffer.concat([Buffer.from("fLaC", "ascii"), Buffer.alloc(100)]);

    const res = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "voice_sample")
      .attach("file", flacHeader, { filename: "sample.flac", contentType: "audio/flac" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fields).toHaveProperty("file");
  });

  it("GET /api/v1/uploads/:id returns the created upload", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const buffer = writeSineWav(2);

    const created = await agent
      .post("/api/v1/uploads")
      .set("X-CSRF-Token", csrfToken)
      .field("purpose", "transcription")
      .attach("file", buffer, { filename: "sample.wav", contentType: "audio/wav" })
      .expect(201);

    const res = await agent.get(`/api/v1/uploads/${created.body.data.id}`).expect(200);
    expect(res.body.data.id).toBe(created.body.data.id);
    expect(res.body.data.purpose).toBe("transcription");
  });
});
