import { describe, expect, it } from "vitest";

import { voiceRepository } from "../src/repositories/voice.repository";
import { storageService } from "../src/services/storage.service";
import { writeSineWav } from "../src/libs/utils/wavWriter";
import { buildTestApp, loginAgent } from "./helpers/app";

describe("GET /api/v1/voices", () => {
  it("syncs and lists the mock provider's fixed 6 built-in voices", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    const res = await agent.get("/api/v1/voices?type=built-in").expect(200);
    expect(res.body.data).toHaveLength(6);
    for (const voice of res.body.data) {
      expect(voice.type).toBe("built-in");
      expect(voice.deletionStatus).toBe("active");
    }
  });

  it("filters by search keyword", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    await agent.get("/api/v1/voices").expect(200); // trigger sync
    const res = await agent.get("/api/v1/voices?q=Aria").expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((v: { name: string }) => v.name.includes("Aria"))).toBe(true);
  });
});

describe("built-in voices cannot be renamed or deleted", () => {
  it("PATCH returns 409 CONFLICT for a built-in voice", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    await agent.get("/api/v1/voices").expect(200);
    const list = await agent.get("/api/v1/voices?type=built-in").expect(200);
    const builtIn = list.body.data[0];

    const res = await agent.patch(`/api/v1/voices/${builtIn.id}`).set("X-CSRF-Token", csrfToken).send({ name: "New Name" }).expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("DELETE returns 409 CONFLICT for a built-in voice", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    await agent.get("/api/v1/voices").expect(200);
    const list = await agent.get("/api/v1/voices?type=built-in").expect(200);
    const builtIn = list.body.data[0];

    const res = await agent.delete(`/api/v1/voices/${builtIn.id}`).set("X-CSRF-Token", csrfToken).send({ confirm: true }).expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("custom/designed voices: rename and confirmed delete", () => {
  it("renames a custom voice", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const voice = await voiceRepository.insert({ providerVoiceId: "custom_1", name: "Original Name", type: "custom", deletionStatus: "active" });

    const res = await agent.patch(`/api/v1/voices/${voice.id}`).set("X-CSRF-Token", csrfToken).send({ name: "Renamed Voice" }).expect(200);
    expect(res.body.data.name).toBe("Renamed Voice");
  });

  it("deletes a custom voice only when confirm:true is sent, transitioning deletionStatus to deleted", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const voice = await voiceRepository.insert({ providerVoiceId: "custom_2", name: "To Delete", type: "custom", deletionStatus: "active" });

    const missingConfirm = await agent.delete(`/api/v1/voices/${voice.id}`).set("X-CSRF-Token", csrfToken).send({}).expect(400);
    expect(missingConfirm.body.error.code).toBe("VALIDATION_FAILED");

    const res = await agent.delete(`/api/v1/voices/${voice.id}`).set("X-CSRF-Token", csrfToken).send({ confirm: true }).expect(200);
    expect(res.body.data.deletionStatus).toBe("deleted");
  });

  it("GET /voices/:id/preview serves Range-capable audio when a preview exists, 404 otherwise", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    const withoutPreview = await voiceRepository.insert({ providerVoiceId: "designed_no_preview", name: "No Preview", type: "designed", deletionStatus: "active" });
    await agent.get(`/api/v1/voices/${withoutPreview.id}/preview`).expect(404);

    const buffer = writeSineWav(2);
    const { storageKey } = await storageService.storeBuffer(buffer, "audio/wav");
    const withPreview = await voiceRepository.insert({
      providerVoiceId: "designed_with_preview",
      name: "Has Preview",
      type: "designed",
      deletionStatus: "active",
      previewStorageKey: storageKey,
      previewMimeType: "audio/wav",
    });

    const full = await agent.get(`/api/v1/voices/${withPreview.id}/preview`).expect(200);
    expect(full.headers["content-type"]).toBe("audio/wav");

    const ranged = await agent.get(`/api/v1/voices/${withPreview.id}/preview`).set("Range", "bytes=0-9").expect(206);
    expect(ranged.headers["content-range"]).toMatch(/^bytes 0-9\//);
  });
});
