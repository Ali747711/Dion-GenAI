import type { MusicInput } from "@/lib/api/types"

/** Composer draft persisted locally (PRD F1) with an explicit clear action. */
export interface ComposerDraft {
  input: MusicInput
  projectId: string | null
  /** Stable per-submission key so retries/double clicks reuse one job. */
  idempotencyKey: string
  updatedAt: string
}

const DRAFT_KEY = "ms:composer-draft:v1"

export const EMPTY_MUSIC_INPUT: MusicInput = {
  prompt: "",
  lyricsMode: "generate",
  lyrics: "",
  lyricsPrompt: "",
  title: "",
  tags: [],
  negativeTags: [],
  vocalGender: null,
}

export function newDraft(): ComposerDraft {
  return {
    input: { ...EMPTY_MUSIC_INPUT },
    projectId: null,
    idempotencyKey: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  }
}

export function loadDraft(): ComposerDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ComposerDraft>
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.idempotencyKey !== "string" ||
      typeof parsed.input !== "object" ||
      parsed.input === null
    ) {
      return null
    }
    return {
      input: { ...EMPTY_MUSIC_INPUT, ...parsed.input },
      projectId: parsed.projectId ?? null,
      idempotencyKey: parsed.idempotencyKey,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveDraft(draft: ComposerDraft): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    )
  } catch {
    // Storage unavailable (private mode); drafts simply do not persist.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Ignore storage failures.
  }
}
