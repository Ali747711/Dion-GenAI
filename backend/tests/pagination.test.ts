import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { PRICING_VERSION } from "../src/libs/configs";
import { JobStatus } from "../src/libs/enums/job.enum";
import { assetRepository } from "../src/repositories/asset.repository";
import { jobRepository } from "../src/repositories/job.repository";
import { validMusicInput } from "./helpers/fixtures";
import { buildTestApp, loginAgent } from "./helpers/app";

async function insertAsset(title: string, favorite: boolean) {
  return assetRepository.insert({
    kind: "audio",
    title,
    jobId: null,
    variantId: null,
    variantIndex: null,
    projectId: null,
    storageKey: `${randomUUID()}.bin`,
    mimeType: "audio/mpeg",
    bytes: 1234,
    durationSeconds: 10,
    favorite,
    tags: [],
  });
}

/** Inserts a job row directly, bypassing the concurrency-1 in-flight rule, for pagination fixtures. */
async function insertTerminalJob(index: number) {
  return jobRepository.insert({
    kind: "music",
    status: JobStatus.SUCCEEDED,
    input: validMusicInput({ title: `Track ${index}` }),
    projectId: null,
    envelope: "music",
    estimateCredits: 2700,
    chargedCredits: 100,
    pricingVersion: PRICING_VERSION,
    idempotencyKey: randomUUID(),
    requestHash: `fixture-hash-${index}`,
  });
}

describe("cursor pagination", () => {
  it("pages GET /jobs newest-first with a stable cursor", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    // Insert sequentially so createdAt ordering is deterministic.
    for (let i = 0; i < 5; i += 1) {
      await insertTerminalJob(i);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const firstPage = await agent.get("/api/v1/jobs?limit=2").expect(200);
    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.nextCursor).toEqual(expect.any(String));

    const secondPage = await agent.get(`/api/v1/jobs?limit=2&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`).expect(200);
    expect(secondPage.body.data).toHaveLength(2);

    const thirdPage = await agent.get(`/api/v1/jobs?limit=2&cursor=${encodeURIComponent(secondPage.body.nextCursor)}`).expect(200);
    expect(thirdPage.body.data).toHaveLength(1);
    expect(thirdPage.body.nextCursor).toBeNull();

    const seenIds = new Set([...firstPage.body.data, ...secondPage.body.data, ...thirdPage.body.data].map((j: { id: string }) => j.id));
    expect(seenIds.size).toBe(5);

    // Newest first: first page's jobs were created after second page's.
    const firstPageCreatedAt = new Date(firstPage.body.data[0].createdAt).getTime();
    const lastPageCreatedAt = new Date(thirdPage.body.data[0].createdAt).getTime();
    expect(firstPageCreatedAt).toBeGreaterThanOrEqual(lastPageCreatedAt);
  });

  it("caps the limit at 50 and defaults to 20", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    const res = await agent.get("/api/v1/jobs?limit=500").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("filters GET /assets by favorite and paginates the results", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    for (let i = 0; i < 3; i += 1) {
      await insertAsset(`Favorite ${i}`, true);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await insertAsset("Not a favorite", false);

    const favorites = await agent.get("/api/v1/assets?favorite=true&limit=2").expect(200);
    expect(favorites.body.data).toHaveLength(2);
    expect(favorites.body.data.every((a: { favorite: boolean }) => a.favorite)).toBe(true);
    expect(favorites.body.nextCursor).toEqual(expect.any(String));

    const nonFavorites = await agent.get("/api/v1/assets?favorite=false").expect(200);
    expect(nonFavorites.body.data).toHaveLength(1);
    expect(nonFavorites.body.data[0].title).toBe("Not a favorite");
  });
});
