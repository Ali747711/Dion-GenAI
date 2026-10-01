import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondData, respondError } from "../libs/utils/respond";
import { connectionService } from "../services/connection.service";

export const connectionController: Record<string, RequestHandler> = {};

connectionController.getStatus = async (_req, res) => {
  try {
    respondData(res, HttpCode.OK, connectionService.getStatus());
  } catch (error) {
    respondError(res, error);
  }
};
