import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { REQUEST_ID_HEADER } from "../libs/configs";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  const requestId = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function getRequestId(res: Response): string {
  return (res.locals.requestId as string | undefined) ?? "unknown";
}
