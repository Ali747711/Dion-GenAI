import { z } from "zod";

export const voiceIdParamSchema = z.object({
  id: z.uuid(),
});

export const listVoicesQuerySchema = z.object({
  type: z.enum(["built-in", "custom", "designed"]).optional(),
  q: z.string().max(200).optional(),
});

export const voiceUpdateSchema = z.object({
  name: z.string().min(1).max(120),
});

export const voiceDeleteSchema = z.object({
  confirm: z.literal(true),
});

export const soundHistoryQuerySchema = z.object({
  skip: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const soundHistoryDeleteSchema = z.object({
  confirm: z.literal(true),
});

export const soundHistoryParamSchema = z.object({
  genProductId: z.string().min(1).max(200),
});

export const transcriptQuerySchema = z.object({
  format: z.enum(["txt", "srt", "json"]).default("txt"),
});
