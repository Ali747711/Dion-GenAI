import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondList, respondError } from "../libs/utils/respond";
import { capabilityService } from "../services/capability.service";

export const capabilityController: Record<string, RequestHandler> = {};

capabilityController.list = async (_req, res) => {
  try {
    const capabilities = await capabilityService.listCapabilities();
    respondList(res, HttpCode.OK, capabilities, null);
  } catch (error) {
    respondError(res, error);
  }
};
