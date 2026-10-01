import session from "express-session";

import { env } from "../config/env";
import { SESSION_COOKIE_NAME } from "../libs/configs";
import { PgSessionStore } from "../services/sessionStore.service";

export const sessionStore = new PgSessionStore();

export const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: true,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
