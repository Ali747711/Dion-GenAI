import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondData, respondError, respondList } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { usageService } from "../services/usage.service";
import { ledgerListQuerySchema, reconciliationSchema } from "../validators/usage.validator";

export const usageController: Record<string, RequestHandler> = {};

usageController.getUsage = async (_req, res) => {
  try {
    const usage = await usageService.getUsage();
    respondData(res, HttpCode.OK, usage);
  } catch (error) {
    respondError(res, error);
  }
};

usageController.getLedger = async (req, res) => {
  try {
    const query = parseOrThrow(ledgerListQuerySchema, req.query);
    const { items, nextCursor } = await usageService.listLedger(query.cursor, query.limit);
    respondList(res, HttpCode.OK, items, nextCursor);
  } catch (error) {
    respondError(res, error);
  }
};

usageController.createReconciliation = async (req, res) => {
  try {
    const body = parseOrThrow(reconciliationSchema, req.body);
    const entry = await usageService.createReconciliation(body);
    respondData(res, HttpCode.CREATED, entry);
  } catch (error) {
    respondError(res, error);
  }
};
