import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

import AppError, { ErrorCode, Message } from "../libs/Errors";

const rateLimitedHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(ErrorCode.RATE_LIMITED, Message.RATE_LIMITED, { retryable: true }));
};

/** POST /api/v1/session (login) — brute-force protection. */
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
