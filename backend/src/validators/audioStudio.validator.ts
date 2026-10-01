import { z } from "zod";

import { JobKind } from "../libs/enums/job.enum";
import { SPEECH_STREAM_CHAR_THRESHOLD } from "../libs/configs";
import { musicInputSchema } from "./music.validator";

export const coverInputSchema = z
  .object({
    uploadId: z.uuid(),
    lyrics: z.string().min(1).max(5000),
    melodyAdherence: z.enum(["high", "main_melody"]),
    musicDescription: z.string().max(2000).optional(),
    style: z.string().max(200).optional(),
    title: z.string().max(120).optional(),
    vocalGender: z.enum(["male", "female"]).nullable().optional(),
    rightsConfirmed: z.literal(true),
  })
  .superRefine((value, ctx) => {
    if (!value.musicDescription && !value.style) {
      ctx.addIssue({ code: "custom", path: ["musicDescription"], message: "musicDescription or style is required" });
    }
  });

export const lyricsRecognitionInputSchema = z.object({
  uploadId: z.uuid(),
});

export const soundInputSchema = z.object({
  prompt: z.string().min(1).max(500),
  durationSeconds: z.number().int().min(1).max(30).default(10),
  format: z.enum(["wav", "mp3"]).default("wav"),
});

export const speechInputSchema = z
  .object({
    text: z.string().min(1).max(50000),
    voiceId: z.uuid(),
    format: z.enum(["wav", "mp3"]).default("wav"),
    speed: z.number().min(0.5).max(2).optional(),
    targetLang: z.string().max(10).optional(),
    trimSilence: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.format === "mp3" && value.text.length > SPEECH_STREAM_CHAR_THRESHOLD) {
      ctx.addIssue({
        code: "custom",
        path: ["format"],
        message: `mp3 is only allowed when text is <= ${SPEECH_STREAM_CHAR_THRESHOLD} chars (long-form uses streaming WAV)`,
      });
    }
  });

export const emotionInputSchema = z.object({
  text: z.string().min(1).max(5000),
});

export const voiceDesignInputSchema = z.object({
  voiceDescription: z.string().min(20).max(1000),
  guidanceScale: z.number().min(0).max(100).optional(),
  loudness: z.number().min(-1).max(1).optional(),
  name: z.string().max(120).optional(),
});

export const voiceCloneInputSchema = z.object({
  uploadId: z.uuid(),
  name: z.string().min(1).max(80),
  language: z.string().max(10).optional(),
  denoise: z.boolean().optional(),
  permissionConfirmed: z.literal(true),
});

export const transcriptionInputSchema = z.object({
  uploadId: z.uuid(),
  language: z.string().max(10).optional(),
});

/** Selects the right per-kind Zod schema for `POST /jobs` and `POST /estimates`. */
export const jobInputSchemaByKind: Record<JobKind, z.ZodType> = {
  [JobKind.MUSIC]: musicInputSchema,
  [JobKind.COVER]: coverInputSchema,
  [JobKind.LYRICS_RECOGNITION]: lyricsRecognitionInputSchema,
  [JobKind.SOUND]: soundInputSchema,
  [JobKind.SPEECH]: speechInputSchema,
  [JobKind.EMOTION_ENHANCE]: emotionInputSchema,
  [JobKind.VOICE_DESIGN]: voiceDesignInputSchema,
  [JobKind.VOICE_CLONE]: voiceCloneInputSchema,
  [JobKind.TRANSCRIPTION]: transcriptionInputSchema,
};
