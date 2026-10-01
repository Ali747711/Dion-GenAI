import { z } from "zod";

export const uploadIdParamSchema = z.object({
  id: z.uuid(),
});

export const uploadPurposeSchema = z.enum(["cover_source", "voice_sample", "transcription"]);
