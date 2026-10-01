import { z } from "zod";

import { coerceBoolean } from "../libs/utils/zodCoerce";

export const assetIdParamSchema = z.object({
  id: z.uuid(),
});

export const assetUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    favorite: z.boolean().optional(),
    archived: z.boolean().optional(),
    projectId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const listAssetsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  favorite: coerceBoolean(),
  projectId: z.uuid().optional(),
  archived: coerceBoolean(),
  source: z.enum(["music", "cover", "sound", "speech", "voice_preview"]).optional(),
  sort: z.enum(["createdAt", "title", "duration"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
