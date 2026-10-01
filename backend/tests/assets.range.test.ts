import { readFileSync } from "node:fs";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { setMusicProviderForTests } from "../src/services/provider/provider.factory";
import { buildTestApp, loginAgent } from "./helpers/app";
import { binaryParser } from "./helpers/binaryParser";
import { FIXTURE_AUDIO_PATH } from "./helpers/fixtures";
import { seedSucceededJob } from "./helpers/seedJob";

afterEach(() => {
  setMusicProviderForTests(null);
});

describe("asset content delivery", () => {
  it("serves the full file with Accept-Ranges when no Range header is sent", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const res = await agent.get(`/api/v1/assets/${assetIds[0]}/content`).expect(200);
    expect(res.headers["accept-ranges"]).toBe("bytes");
    const expected = readFileSync(FIXTURE_AUDIO_PATH);
    expect(Number(res.headers["content-length"])).toBe(expected.length);
  });

  it("serves a 206 partial response for a byte Range request", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const res = await agent.get(`/api/v1/assets/${assetIds[0]}/content`).set("Range", "bytes=0-99").buffer(true).parse(binaryParser).expect(206);
    expect(res.headers["content-range"]).toMatch(/^bytes 0-99\/\d+$/);
    expect(Number(res.headers["content-length"])).toBe(100);
    expect((res.body as Buffer).length).toBe(100);

    const expected = readFileSync(FIXTURE_AUDIO_PATH).subarray(0, 100);
    expect(Buffer.compare(res.body as Buffer, expected)).toBe(0);
  });

  it("serves a suffix Range request (last N bytes)", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const full = readFileSync(FIXTURE_AUDIO_PATH);
    const res = await agent.get(`/api/v1/assets/${assetIds[0]}/content`).set("Range", "bytes=-50").buffer(true).parse(binaryParser).expect(206);
    expect(Number(res.headers["content-length"])).toBe(50);
    const expected = full.subarray(full.length - 50);
    expect(Buffer.compare(res.body as Buffer, expected)).toBe(0);
  });

  it("returns 416 for an out-of-range Range request", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const full = readFileSync(FIXTURE_AUDIO_PATH);
    await agent
      .get(`/api/v1/assets/${assetIds[0]}/content`)
      .set("Range", `bytes=${full.length + 1000}-${full.length + 2000}`)
      .expect(416);
  });

  it("downloads with an attachment disposition and the real extension", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const res = await agent.get(`/api/v1/assets/${assetIds[0]}/download`).expect(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toMatch(/\.mp3"$/);
  });

  it("requires auth to fetch asset content", async () => {
    const app = buildTestApp();
    const { assetIds } = await seedSucceededJob();
    const res = await request(app).get(`/api/v1/assets/${assetIds[0]}/content`).expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
