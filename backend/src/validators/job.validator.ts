import { z } from "zod";

import { JobKind, JobStatus } from "../libs/enums/job.enum";

/** Validates the envelope only; `input` is re-validated against the kind-specific schema by the controller. */
export const createJobSchema = z.object({
  kind: z.enum(Object.values(JobKind) as [string, ...string[]]),
  idempotencyKey: z.uuid(),
  input: z.unknown(),
  projectId: z.uuid().optional(),
});

export const estimateRequestEnvelopeSchema = z.object({
  kind: z.enum(Object.values(JobKind) as [string, ...string[]]),
  input: z.unknown(),
});

export const listJobsQuerySchema = z.object({
  status: z.enum(Object.values(JobStatus) as [string, ...string[]]).optional(),
  kind: z.enum(Object.values(JobKind) as [string, ...string[]]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const jobIdParamSchema = z.object({
  id: z.uuid(),
});
