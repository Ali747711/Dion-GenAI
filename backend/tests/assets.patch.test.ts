import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { setMusicProviderForTests } from "../src/services/provider/provider.factory";
import { buildTestApp, loginAgent } from "./helpers/app";
import { seedSucceededJob } from "./helpers/seedJob";

afterEach(() => {
  setMusicProviderForTests(null);
});

describe("PATCH /api/v1/assets/:id", () => {
  it("updates title, favorite, and archived", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const res = await agent
      .patch(`/api/v1/assets/${assetIds[0]}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ title: "New Title", favorite: true, archived: true })
      .expect(200);

    expect(res.body.data.title).toBe("New Title");
    expect(res.body.data.favorite).toBe(true);
    expect(res.body.data.archived).toBe(true);
  });

  it("assigns a project via projectId and clears it back to null", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const project = await agent.post("/api/v1/projects").set("X-CSRF-Token", csrfToken).send({ name: "Album One" }).expect(201);

    const withProject = await agent
      .patch(`/api/v1/assets/${assetIds[0]}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ projectId: project.body.data.id })
      .expect(200);
    expect(withProject.body.data.projectId).toBe(project.body.data.id);
    expect(withProject.body.data.projectName).toBe("Album One");

    const cleared = await agent.patch(`/api/v1/assets/${assetIds[0]}`).set("X-CSRF-Token", csrfToken).send({ projectId: null }).expect(200);
    expect(cleared.body.data.projectId).toBeNull();
  });

  it("rejects an update to a non-existent project with 400 VALIDATION_FAILED", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const res = await agent
      .patch(`/api/v1/assets/${assetIds[0]}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ projectId: randomUUID() })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 404 NOT_FOUND for an unknown asset id", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent.patch(`/api/v1/assets/${randomUUID()}`).set("X-CSRF-Token", csrfToken).send({ favorite: true }).expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an empty patch body with 400 VALIDATION_FAILED", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    const { assetIds } = await seedSucceededJob();

    const res = await agent.patch(`/api/v1/assets/${assetIds[0]}`).set("X-CSRF-Token", csrfToken).send({}).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
