import type { NextFunction, Request, Response } from "express";

import AppError, { ErrorCode, Message } from "../libs/Errors";

/**
 * Every route requires an authenticated owner session except
 * GET/POST /api/v1/session and /health/*.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (req.session?.authenticated) {
    next();
    return;
  }
  next(new AppError(ErrorCode.UNAUTHENTICATED, Message.NOT_AUTHENTICATED));
}
