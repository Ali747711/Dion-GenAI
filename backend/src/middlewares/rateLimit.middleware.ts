import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

import AppError, { ErrorCode, Message } from "../libs/Errors";

const rateLimitedHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(ErrorCode.RATE_LIMITED, Message.RATE_LIMITED, { retryable: true }));
};

/**
 * Global cap on FAILED logins, independent of client IP. Behind a proxy the
 * visible IP is the proxy's (shared), and a direct caller can pick its own, so
 * per-IP limits alone cannot stop brute force against the single owner password.
 */
export const globalFailedLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: () => "owner-login",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
});

/** POST /api/v1/session (login) — per-client brute-force protection. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
});

/** POST /api/v1/jobs — protects the paid-generation path. */
export const jobCreationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedHandler,
});
