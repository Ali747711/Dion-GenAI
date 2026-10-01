import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildTestApp, loginAgent } from "./helpers/app";

describe("authentication", () => {
  it("allows health checks without a session", async () => {
    const app = buildTestApp();
    await request(app).get("/health/live").expect(200, { status: "ok" });
    const ready = await request(app).get("/health/ready").expect(200);
    expect(ready.body).toEqual({ status: "ok", db: true });
  });

  it("allows GET /session without a session", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/v1/session").expect(200);
    expect(res.body.data.authenticated).toBe(false);
    expect(typeof res.body.data.csrfToken).toBe("string");
  });

  it("rejects protected routes with 401 UNAUTHENTICATED when there is no session", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/v1/jobs").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(typeof res.body.error.requestId).toBe("string");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("rejects capabilities, connection, assets, projects, usage, budget without a session", async () => {
    const app = buildTestApp();
    for (const path of ["/api/v1/capabilities", "/api/v1/connection", "/api/v1/assets", "/api/v1/projects", "/api/v1/usage", "/api/v1/budget"]) {
      const res = await request(app).get(path).expect(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects DELETE /session (logout) without a prior session", async () => {
    const app = buildTestApp();
    const res = await request(app).delete("/api/v1/session").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logs in with the correct password and allows protected routes afterward", async () => {
    const app = buildTestApp();
    const { agent } = await loginAgent(app);
    const res = await agent.get("/api/v1/jobs").expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("rejects an incorrect password with 401 INVALID_CREDENTIALS", async () => {
    const app = buildTestApp();
    const agent = request.agent(app);
    const sessionRes = await agent.get("/api/v1/session").expect(200);
    const csrfToken = sessionRes.body.data.csrfToken;

    const res = await agent.post("/api/v1/session").set("X-CSRF-Token", csrfToken).send({ password: "wrong-password" }).expect(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs out and revokes access to protected routes", async () => {
    const app = buildTestApp();
    const { agent, csrfToken } = await loginAgent(app);
    await agent.delete("/api/v1/session").set("X-CSRF-Token", csrfToken).expect(200);
    const res = await agent.get("/api/v1/jobs").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
