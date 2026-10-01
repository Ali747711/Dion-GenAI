import type { RequestHandler } from "express";

import type { JobKind } from "../libs/enums/job.enum";
import AppError, { ErrorCode, HttpCode, Message } from "../libs/Errors";
import type { JobInput } from "../libs/types/job";
import { respondData, respondError, respondList } from "../libs/utils/respond";
import { parseNestedOrThrow, parseOrThrow } from "../libs/utils/validate";
import { jobService } from "../services/job.service";
import { transcriptService } from "../services/transcript.service";
import { jobInputSchemaByKind } from "../validators/audioStudio.validator";
import { createJobSchema, jobIdParamSchema, listJobsQuerySchema } from "../validators/job.validator";
import { transcriptQuerySchema } from "../validators/voice.validator";

export const jobController: Record<string, RequestHandler> = {};

jobController.create = async (req, res) => {
  try {
    const body = parseOrThrow(createJobSchema, req.body);
    const kind = body.kind as JobKind;
    const inputSchema = jobInputSchemaByKind[kind];
    if (!inputSchema) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { kind: "Unsupported job kind" } });
    }
    const input = parseNestedOrThrow(inputSchema, body.input, "input") as JobInput;
    const outcome = await jobService.createJob({ kind, idempotencyKey: body.idempotencyKey, input, projectId: body.projectId });
    respondData(res, outcome.alreadyExisted ? HttpCode.OK : HttpCode.ACCEPTED, outcome.job);
  } catch (error) {
    respondError(res, error);
  }
};

jobController.list = async (req, res) => {
  try {
    const query = parseOrThrow(listJobsQuerySchema, req.query);
    const { items, nextCursor } = await jobService.listJobs(query);
    respondList(res, HttpCode.OK, items, nextCursor);
  } catch (error) {
    respondError(res, error);
  }
};

jobController.getById = async (req, res) => {
  try {
    const { id } = parseOrThrow(jobIdParamSchema, req.params);
    const job = await jobService.getJob(id);
    respondData(res, HttpCode.OK, job);
  } catch (error) {
    respondError(res, error);
  }
};

jobController.cancel = async (req, res) => {
  try {
    const { id } = parseOrThrow(jobIdParamSchema, req.params);
    const job = await jobService.cancelJob(id);
    respondData(res, HttpCode.OK, job);
  } catch (error) {
    respondError(res, error);
  }
};

jobController.transcript = async (req, res) => {
  try {
    const { id } = parseOrThrow(jobIdParamSchema, req.params);
    const { format } = parseOrThrow(transcriptQuerySchema, req.query);
    const exported = await transcriptService.exportTranscript(id, format);
    res.setHeader("Content-Type", exported.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    res.status(HttpCode.OK).send(exported.content);
  } catch (error) {
    respondError(res, error);
  }
};
