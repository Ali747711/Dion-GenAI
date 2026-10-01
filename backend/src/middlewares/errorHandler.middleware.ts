import type { NextFunction, Request, Response } from "express";

import AppError, { ErrorCode, Message } from "../libs/Errors";
import { respondError } from "../libs/utils/respond";

interface HttpLikeError {
  type?: string;
  status?: number;
  statusCode?: number;
}

function isHttpLikeError(error: unknown): error is HttpLikeError {
  return typeof error === "object" && error !== null;
}

/**
 * Final safety net for errors thrown by middleware (auth, csrf, rate limit,
 * body parsing) that never reach a controller's own try/catch.
 */
export function errorHandlerMiddleware(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    respondError(res, err);
    return;
  }

  if (isHttpLikeError(err)) {
    if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
      respondError(res, new AppError(ErrorCode.PAYLOAD_TOO_LARGE, Message.PAYLOAD_TOO_LARGE));
      return;
    }
    if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
      respondError(res, new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED));
      return;
    }
  }

  respondError(res, err);
}

export function notFoundMiddleware(_req: Request, res: Response): void {
  respondError(res, new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND));
}
