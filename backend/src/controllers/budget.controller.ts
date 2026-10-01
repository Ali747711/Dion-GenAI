import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondData, respondError } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { usageService } from "../services/usage.service";
import { budgetUpdateSchema } from "../validators/usage.validator";
import { MAX_CONCURRENT_PAID_JOBS } from "../libs/configs";

export const budgetController: Record<string, RequestHandler> = {};

budgetController.get = async (_req, res) => {
  try {
    const settings = await usageService.getBudgetSettings();
    respondData(res, HttpCode.OK, { ...settings, maxConcurrentPaidJobs: MAX_CONCURRENT_PAID_JOBS });
  } catch (error) {
    respondError(res, error);
  }
};

budgetController.update = async (req, res) => {
  try {
    const patch = parseOrThrow(budgetUpdateSchema, req.body);
    const settings = await usageService.updateBudgetSettings(patch);
    respondData(res, HttpCode.OK, { ...settings, maxConcurrentPaidJobs: MAX_CONCURRENT_PAID_JOBS });
  } catch (error) {
    respondError(res, error);
  }
};
