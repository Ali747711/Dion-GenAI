import type { MusicInput } from "@/lib/api/types"

export const LIMITS = {
  prompt: 2000,
  lyrics: 5000,
  lyricsPrompt: 1000,
  title: 120,
  tagCount: 10,
  tagLength: 40,
} as const

/** Client-side mirror of the contract validation; server remains authoritative. */
export function validateMusicInput(input: MusicInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const prompt = input.prompt.trim()
  if (!prompt) {
    errors.prompt = "Describe the song you want."
  } else if (prompt.length > LIMITS.prompt) {
    errors.prompt = `Keep the description under ${LIMITS.prompt} characters.`
  }

  if (input.lyricsMode === "lyrics") {
    const lyrics = input.lyrics?.trim() ?? ""
    if (!lyrics) {
      errors.lyrics = "Write the lyrics, or switch to Generate lyrics."
    } else if (lyrics.length > LIMITS.lyrics) {
      errors.lyrics = `Lyrics must stay under ${LIMITS.lyrics} characters.`
    }
  } else {
    const lyricsPrompt = input.lyricsPrompt?.trim() ?? ""
    if (!lyricsPrompt) {
      errors.lyricsPrompt =
        "Describe what the lyrics should be about, or switch to Write lyrics."
    } else if (lyricsPrompt.length > LIMITS.lyricsPrompt) {
      errors.lyricsPrompt = `Keep the lyrics brief under ${LIMITS.lyricsPrompt} characters.`
    }
  }

  if (input.title && input.title.trim().length > LIMITS.title) {
    errors.title = `Titles are limited to ${LIMITS.title} characters.`
  }

  for (const [field, tags] of [
    ["tags", input.tags],
    ["negativeTags", input.negativeTags],
  ] as const) {
    if (!tags) continue
    if (tags.length > LIMITS.tagCount) {
      errors[field] = `Use at most ${LIMITS.tagCount} tags.`
    } else if (tags.some((tag) => tag.length > LIMITS.tagLength)) {
      errors[field] = `Each tag must stay under ${LIMITS.tagLength} characters.`
    }
  }

  return errors
}

/** Normalize the draft into the exact payload the contract expects. */
export function sanitizeMusicInput(input: MusicInput): MusicInput {
  const base: MusicInput = {
    prompt: input.prompt.trim(),
    lyricsMode: input.lyricsMode,
  }
  if (input.lyricsMode === "lyrics") {
    base.lyrics = input.lyrics?.trim()
  } else {
    base.lyricsPrompt = input.lyricsPrompt?.trim()
  }
  const title = input.title?.trim()
  if (title) base.title = title
  if (input.tags && input.tags.length > 0) base.tags = input.tags
  if (input.negativeTags && input.negativeTags.length > 0) {
    base.negativeTags = input.negativeTags
  }
  if (input.vocalGender) base.vocalGender = input.vocalGender
  return base
}

export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}
