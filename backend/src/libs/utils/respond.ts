import type { Response } from "express";

import AppError, { HttpCode } from "../Errors";
import { logger } from "./logger";
import { getRequestId } from "../../middlewares/requestId.middleware";

export function respondData<T>(res: Response, status: HttpCode, data: T): void {
  res.status(status).json({ data });
}

export function respondList<T>(res: Response, status: HttpCode, data: T[], nextCursor: string | null): void {
  res.status(status).json({ data, nextCursor });
}

/** The universal controller catch block. Every handler funnels errors here. */
export function respondError(res: Response, error: unknown): void {
  const requestId = getRequestId(res);

  if (error instanceof AppError) {
    res.status(error.httpStatus).json({
      error: {
        code: error.code,
        message: error.message,
        requestId,
        retryable: error.retryable,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  logger.error({ err: error, requestId }, "Unhandled error");
  res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
    error: {
      code: AppError.standard.code,
      message: AppError.standard.message,
      requestId,
      retryable: true,
    },
  });
}
