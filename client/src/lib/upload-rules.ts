/**
 * Client-side upload prechecks per purpose (API_CONTRACT.md upload limits).
 * The server remains authoritative: it re-detects type via magic bytes and
 * duration via ffprobe; these checks only catch obvious mistakes early.
 */

import type { UploadPurpose } from "@/lib/api/studio-types"

interface UploadRule {
  /** Lowercase file extensions without the dot. */
  extensions: readonly string[]
  maxBytes: number
  maxDurationSeconds: number | null
  /** Human copy shown under the drop zone. */
  hint: string
}

const MB = 1024 * 1024

export const UPLOAD_RULES: Record<UploadPurpose, UploadRule> = {
  cover_source: {
    extensions: ["mp3", "wav", "flac", "m4a", "aac", "ogg"],
    maxBytes: 100 * MB,
    maxDurationSeconds: null,
    hint: "MP3, WAV, FLAC, M4A, AAC, or OGG — up to 100 MB.",
  },
  voice_sample: {
    extensions: ["wav", "mp3", "m4a"],
    maxBytes: 20 * MB,
    maxDurationSeconds: 60,
    hint: "WAV, MP3, or M4A — up to 20 MB and 60 seconds.",
  },
  transcription: {
    extensions: ["mp3", "wav", "m4a", "ogg", "flac", "aac", "webm"],
    maxBytes: 50 * MB,
    maxDurationSeconds: 600,
    hint: "MP3, WAV, M4A, OGG, FLAC, AAC, or WEBM — up to 50 MB and 10 minutes.",
  },
}

/** `accept` attribute for the hidden file input. */
export function acceptAttribute(purpose: UploadPurpose): string {
  return UPLOAD_RULES[purpose].extensions.map((ext) => `.${ext}`).join(",")
}

/** Returns a user-facing error, or null when the file passes the precheck. */
export function precheckFile(purpose: UploadPurpose, file: File): string | null {
  const rule = UPLOAD_RULES[purpose]
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!rule.extensions.includes(extension)) {
    return `This file type is not accepted here. Use ${rule.extensions
      .map((ext) => ext.toUpperCase())
      .join(", ")}.`
  }
  if (file.size > rule.maxBytes) {
    return `The file is ${(file.size / MB).toFixed(1)} MB; the limit for this purpose is ${Math.round(rule.maxBytes / MB)} MB.`
  }
  if (file.size === 0) {
    return "The file is empty."
  }
  return null
}
