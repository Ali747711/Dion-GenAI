import type { NextFunction, Request, Response } from "express";

import { CSRF_HEADER } from "../libs/configs";
import AppError, { ErrorCode, Message } from "../libs/Errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Every non-GET request must send `X-CSRF-Token` equal to the session's
 * csrfToken (issued by GET/POST /session). Missing/wrong -> 403 CSRF_INVALID.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const header = req.header(CSRF_HEADER);
  const expected = req.session?.csrfToken;

  if (!expected || !header || header !== expected) {
    next(new AppError(ErrorCode.CSRF_INVALID, Message.CSRF_INVALID));
    return;
  }

  next();
}
