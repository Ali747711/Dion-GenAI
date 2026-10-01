import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TEST_OWNER_PASSWORD } from "./setup";

// Production sits behind TLS-terminating proxies (Vercel rewrite → Render edge).
// Without proxy trust, express-session silently drops Secure cookies and login breaks.
describe("production behind a TLS-terminating proxy", () => {
  let app: Express;
  const previous = { COOKIE_SECURE: process.env.COOKIE_SECURE, TRUST_PROXY: process.env.TRUST_PROXY };

  beforeAll(async () => {
    process.env.COOKIE_SECURE = "true";
    process.env.TRUST_PROXY = "1";
    vi.resetModules();
    const { createApp } = await import("../src/app");
    app = createApp();
  });

  afterAll(() => {
    process.env.COOKIE_SECURE = previous.COOKIE_SECURE;
    process.env.TRUST_PROXY = previous.TRUST_PROXY;
    vi.resetModules();
  });

  it("issues a Secure session cookie when the proxy reports https", async () => {
    const session = await request(app).get("/api/v1/session").set("X-Forwarded-Proto", "https").expect(200);
    const cookie = String(session.headers["set-cookie"] ?? "");
    expect(cookie).toContain("ms_sid=");
    expect(cookie).toMatch(/;\s*Secure/i);

    // A browser on https sends the Secure cookie back; supertest's jar would not over http.
    const sid = cookie.split(";")[0] ?? "";
    const login = await request(app)
      .post("/api/v1/session")
      .set("X-Forwarded-Proto", "https")
      .set("Cookie", sid)
      .set("X-CSRF-Token", session.body.data.csrfToken as string)
      .send({ password: TEST_OWNER_PASSWORD })
      .expect(200);
    expect(String(login.headers["set-cookie"] ?? "")).toMatch(/ms_sid=.*;\s*Secure/i);
  });

  it("does not issue the Secure cookie over plain http", async () => {
    const res = await request(app).get("/api/v1/session").expect(200);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});
