import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondData, respondError, respondList } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { soundHistoryService } from "../services/soundHistory.service";
import { soundHistoryDeleteSchema, soundHistoryParamSchema, soundHistoryQuerySchema } from "../validators/voice.validator";

export const soundHistoryController: Record<string, RequestHandler> = {};

soundHistoryController.list = async (req, res) => {
  try {
    const query = parseOrThrow(soundHistoryQuerySchema, req.query);
    const items = await soundHistoryService.list(query.skip ?? 0, query.limit ?? 20);
    respondList(res, HttpCode.OK, items, null);
  } catch (error) {
    respondError(res, error);
  }
};

soundHistoryController.remove = async (req, res) => {
  try {
    const { genProductId } = parseOrThrow(soundHistoryParamSchema, req.params);
    parseOrThrow(soundHistoryDeleteSchema, req.body);
    const result = await soundHistoryService.remove(genProductId);
    respondData(res, HttpCode.OK, result);
  } catch (error) {
    respondError(res, error);
  }
};
