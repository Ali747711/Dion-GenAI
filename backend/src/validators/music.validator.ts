import { z } from "zod";

export const musicInputSchema = z
  .object({
    prompt: z.string().min(1).max(2000),
    lyricsMode: z.enum(["lyrics", "generate"]),
    lyrics: z.string().min(1).max(5000).optional(),
    lyricsPrompt: z.string().min(1).max(1000).optional(),
    title: z.string().max(120).optional(),
    tags: z.array(z.string().max(40)).max(10).optional(),
    negativeTags: z.array(z.string().max(40)).max(10).optional(),
    vocalGender: z.enum(["male", "female"]).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.lyricsMode === "lyrics" && !value.lyrics) {
      ctx.addIssue({
        code: "custom",
        path: ["lyrics"],
        message: "lyrics is required when lyricsMode is 'lyrics'",
      });
    }
    if (value.lyricsMode === "generate" && !value.lyricsPrompt) {
      ctx.addIssue({
        code: "custom",
        path: ["lyricsPrompt"],
        message: "lyricsPrompt is required when lyricsMode is 'generate'",
      });
    }
  });

export type MusicInputParsed = z.infer<typeof musicInputSchema>;
