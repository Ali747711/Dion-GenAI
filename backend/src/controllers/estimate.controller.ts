import type { RequestHandler } from "express";

import type { JobKind } from "../libs/enums/job.enum";
import AppError, { ErrorCode, HttpCode, Message } from "../libs/Errors";
import type { JobInput } from "../libs/types/job";
import { respondData, respondError } from "../libs/utils/respond";
import { parseNestedOrThrow, parseOrThrow } from "../libs/utils/validate";
import { estimateService } from "../services/estimate.service";
import { jobInputSchemaByKind } from "../validators/audioStudio.validator";
import { estimateRequestEnvelopeSchema } from "../validators/job.validator";

export const estimateController: Record<string, RequestHandler> = {};

estimateController.create = async (req, res) => {
  try {
    const envelope = parseOrThrow(estimateRequestEnvelopeSchema, req.body);
    const kind = envelope.kind as JobKind;
    const inputSchema = jobInputSchemaByKind[kind];
    if (!inputSchema) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { kind: "Unsupported job kind" } });
    }
    const input = parseNestedOrThrow(inputSchema, envelope.input, "input") as JobInput;
    const estimate = await estimateService.estimate(kind, input);
    respondData(res, HttpCode.OK, estimate);
  } catch (error) {
    respondError(res, error);
  }
};
