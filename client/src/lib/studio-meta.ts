/** Display metadata for R2 job kinds, asset sources, and USD amounts. */

import type { AssetSource, CoverInput } from "@/lib/api/studio-types"
import type { Job, JobKind, MusicInput } from "@/lib/api/types"

/** Narrow a job to the music input shape via its kind discriminator. */
export function isMusicJob(job: Job): job is Job & { input: MusicInput } {
  return job.kind === "music"
}

/** Narrow a job to the cover input shape via its kind discriminator. */
export function isCoverJob(job: Job): job is Job & { input: CoverInput } {
  return job.kind === "cover"
}

export const JOB_KIND_LABELS: Record<JobKind, string> = {
  music: "Music",
  cover: "Cover",
  lyrics_recognition: "Lyrics recognition",
  sound: "Sound effect",
  speech: "Speech",
  emotion_enhance: "Emotion enhance",
  voice_design: "Voice design",
  voice_clone: "Voice clone",
  transcription: "Transcription",
}

export const ASSET_SOURCE_LABELS: Record<AssetSource, string> = {
  music: "Music",
  cover: "Cover",
  sound: "Sound",
  speech: "Speech",
  voice_preview: "Voice preview",
}

/** Human title for any job kind without assuming the music input shape. */
export function jobDisplayTitle(job: Job): string {
  const label = JOB_KIND_LABELS[job.kind] ?? "Job"
  const input = job.input
  if (
    (job.kind === "music" || job.kind === "cover") &&
    "title" in input &&
    typeof input.title === "string" &&
    input.title.trim()
  ) {
    return input.title.trim()
  }
  if (job.kind === "sound" && "prompt" in input && input.prompt.trim()) {
    const prompt = input.prompt.trim()
    return prompt.length > 60 ? `${prompt.slice(0, 57)}…` : prompt
  }
  return `${label} job`
}

/**
 * Format a contract decimal string as USD without float drift on display.
 * Returns null when the value is not a plain decimal.
 */
export function formatUsd(value: string | null): string {
  if (value === null) return "—"
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value
  const negative = value.startsWith("-")
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".")
  const cents = (fraction + "00").slice(0, 2)
  const extra = fraction.length > 2 ? fraction.slice(2).replace(/0+$/, "") : ""
  const grouped = Number(whole).toLocaleString("en-US")
  return `${negative ? "-" : ""}$${grouped}.${cents}${extra}`
}

/** Plain-language copy for the cover melody adherence choice. */
export const MELODY_ADHERENCE_COPY = {
  high: {
    label: "High",
    description:
      "Follows the full score of the source — melody, harmony, and phrasing stay close to the original.",
  },
  main_melody: {
    label: "Main melody",
    description:
      "Keeps only the main melody line and rebuilds the rest around your description or style.",
  },
} as const
