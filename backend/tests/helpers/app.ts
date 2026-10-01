import type { Express } from "express";
import request from "supertest";

import { createApp } from "../../src/app";
import { TEST_OWNER_PASSWORD } from "../setup";

export function buildTestApp(): Express {
  return createApp();
}

export interface AuthedAgent {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
}

/** Logs in as the owner and returns a cookie-persisting agent plus the post-login CSRF token. */
export async function loginAgent(app: Express): Promise<AuthedAgent> {
  const agent = request.agent(app);

  const sessionRes = await agent.get("/api/v1/session").expect(200);
  const preCsrf = sessionRes.body.data.csrfToken as string;

  const loginRes = await agent
    .post("/api/v1/session")
    .set("X-CSRF-Token", preCsrf)
    .send({ password: TEST_OWNER_PASSWORD })
    .expect(200);

  return { agent, csrfToken: loginRes.body.data.csrfToken as string };
}

/** A fresh, never-logged-in agent, with its (pre-auth) csrfToken. */
export async function anonAgent(app: Express): Promise<AuthedAgent> {
  const agent = request.agent(app);
  const sessionRes = await agent.get("/api/v1/session").expect(200);
  return { agent, csrfToken: sessionRes.body.data.csrfToken as string };
}
