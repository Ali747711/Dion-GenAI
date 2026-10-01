import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";

describe("CSRF protection", () => {
  it("rejects a non-GET request with no X-CSRF-Token header", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    const res = await agent.post("/api/v1/projects").send({ name: "No token" }).expect(403);
    expect(res.body.error.code).toBe("CSRF_INVALID");
  });

  it("rejects a non-GET request with a wrong X-CSRF-Token", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);

    const res = await agent.post("/api/v1/projects").set("X-CSRF-Token", "not-the-real-token").send({ name: "Wrong token" }).expect(403);
    expect(res.body.error.code).toBe("CSRF_INVALID");
  });

  it("accepts a non-GET request with the correct X-CSRF-Token", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);

    const res = await agent.post("/api/v1/projects").set("X-CSRF-Token", csrfToken).send({ name: "Good token" }).expect(201);
    expect(res.body.data.name).toBe("Good token");
  });

  it("never enforces CSRF on GET requests", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    await agent.get("/api/v1/projects").expect(200);
  });
});
