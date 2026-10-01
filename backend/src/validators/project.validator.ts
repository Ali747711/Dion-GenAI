import { z } from "zod";

import { coerceBoolean } from "../libs/utils/zodCoerce";

export const projectIdParamSchema = z.object({
  id: z.uuid(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const projectUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const listProjectsQuerySchema = z.object({
  archived: coerceBoolean(),
});
