import type { RequestHandler } from "express";

import { HttpCode } from "../libs/Errors";
import { respondData, respondError } from "../libs/utils/respond";
import { parseOrThrow } from "../libs/utils/validate";
import { uploadService } from "../services/upload.service";
import { uploadIdParamSchema } from "../validators/upload.validator";

export const uploadController: Record<string, RequestHandler> = {};

uploadController.create = async (req, res) => {
  try {
    const upload = await uploadService.receiveUpload(req);
    respondData(res, HttpCode.CREATED, upload);
  } catch (error) {
    respondError(res, error);
  }
};

uploadController.getById = async (req, res) => {
  try {
    const { id } = parseOrThrow(uploadIdParamSchema, req.params);
    const upload = await uploadService.getUpload(id);
    respondData(res, HttpCode.OK, upload);
  } catch (error) {
    respondError(res, error);
  }
};
