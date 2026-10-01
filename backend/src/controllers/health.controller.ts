import type { RequestHandler } from "express";
import { sql } from "drizzle-orm";

import { db } from "../db/client";
import { logger } from "../libs/utils/logger";

export const healthController: Record<string, RequestHandler> = {};

healthController.live = (_req, res) => {
  res.status(200).json({ status: "ok" });
};

healthController.ready = async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: "ok", db: true });
  } catch (error) {
    logger.error({ err: error }, "Readiness check failed: database unreachable");
    res.status(200).json({ status: "degraded", db: false });
  }
};
