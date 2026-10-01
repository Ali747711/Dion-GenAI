import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { parseRangeHeader } from "../libs/utils/range";
import { respondData, respondError, respondList } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { storageService } from "../services/storage.service";
import { voiceService } from "../services/voice.service";
import { listVoicesQuerySchema, voiceDeleteSchema, voiceIdParamSchema, voiceUpdateSchema } from "../validators/voice.validator";

export const voiceController: Record<string, RequestHandler> = {};

voiceController.list = async (req, res) => {
  try {
    const query = parseOrThrow(listVoicesQuerySchema, req.query);
    const voices = await voiceService.listVoices(query);
    respondList(res, HttpCode.OK, voices, null);
  } catch (error) {
    respondError(res, error);
  }
};

voiceController.getById = async (req, res) => {
  try {
    const { id } = parseOrThrow(voiceIdParamSchema, req.params);
    const voice = await voiceService.getVoice(id);
    respondData(res, HttpCode.OK, voice);
  } catch (error) {
    respondError(res, error);
  }
};

voiceController.update = async (req, res) => {
  try {
    const { id } = parseOrThrow(voiceIdParamSchema, req.params);
    const body = parseOrThrow(voiceUpdateSchema, req.body);
    const voice = await voiceService.renameVoice(id, body.name);
    respondData(res, HttpCode.OK, voice);
  } catch (error) {
    respondError(res, error);
  }
};

voiceController.remove = async (req, res) => {
  try {
    const { id } = parseOrThrow(voiceIdParamSchema, req.params);
    parseOrThrow(voiceDeleteSchema, req.body);
    const voice = await voiceService.deleteVoice(id);
    respondData(res, HttpCode.OK, voice);
  } catch (error) {
    respondError(res, error);
  }
};

voiceController.preview = async (req, res) => {
  try {
    const { id } = parseOrThrow(voiceIdParamSchema, req.params);
    const { storageKey, mimeType } = await voiceService.getPreviewFile(id);
    const stat = await storageService.stat(storageKey);
    const size = stat.size;

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeType);

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Length", String(size));
      res.status(HttpCode.OK);
      storageService.createReadStream(storageKey).pipe(res);
      return;
    }

    const parsed = parseRangeHeader(range, size);
    if (!parsed) {
      res.setHeader("Content-Range", `bytes */${size}`);
      res.status(HttpCode.RANGE_NOT_SATISFIABLE).end();
      return;
    }

    const { start, end } = parsed;
    res.status(HttpCode.PARTIAL_CONTENT);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(end - start + 1));
    storageService.createReadStream(storageKey, { start, end }).pipe(res);
  } catch (error) {
    respondError(res, error);
  }
};
