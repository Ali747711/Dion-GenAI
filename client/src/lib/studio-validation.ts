/**
 * Client-side mirrors of the R2 contract validation; the server stays
 * authoritative. Each validator returns a field → message map (empty = valid).
 */

import type {
  CoverInput,
  SoundInput,
  SpeechInput,
  VoiceCloneInput,
  VoiceDesignInput,
} from "@/lib/api/studio-types"

export const STUDIO_LIMITS = {
  coverLyrics: 5000,
  coverDescription: 2000,
  coverStyle: 200,
  coverTitle: 120,
  soundPrompt: 500,
  soundDurationMin: 1,
  soundDurationMax: 30,
  speechText: 50_000,
  speechMp3Text: 5000,
  speechSpeedMin: 0.5,
  speechSpeedMax: 2,
  speechLang: 10,
  voiceDescriptionMin: 20,
  voiceDescriptionMax: 1000,
  voiceCloneName: 80,
} as const

export function validateCoverInput(
  input: Omit<CoverInput, "rightsConfirmed"> & { rightsConfirmed: boolean }
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.uploadId) {
    errors.uploadId = "Upload the source audio first."
  }
  if (!input.rightsConfirmed) {
    errors.rightsConfirmed =
      "Confirm you have permission to use this recording."
  }
  const lyrics = input.lyrics.trim()
  if (!lyrics) {
    errors.lyrics = "Provide lyrics — write them or use Recognize lyrics."
  } else if (lyrics.length > STUDIO_LIMITS.coverLyrics) {
    errors.lyrics = `Lyrics must stay under ${STUDIO_LIMITS.coverLyrics} characters.`
  }
  const description = input.musicDescription?.trim() ?? ""
  const style = input.style?.trim() ?? ""
  if (!description && !style) {
    errors.musicDescription = "Give a music description or a style — one is required."
  }
  if (description.length > STUDIO_LIMITS.coverDescription) {
    errors.musicDescription = `Keep the description under ${STUDIO_LIMITS.coverDescription} characters.`
  }
  if (style.length > STUDIO_LIMITS.coverStyle) {
    errors.style = `Keep the style under ${STUDIO_LIMITS.coverStyle} characters.`
  }
  if ((input.title?.trim().length ?? 0) > STUDIO_LIMITS.coverTitle) {
    errors.title = `Titles are limited to ${STUDIO_LIMITS.coverTitle} characters.`
  }
  return errors
}

export function validateSoundInput(input: SoundInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const prompt = input.prompt.trim()
  if (!prompt) {
    errors.prompt = "Describe the sound you want."
  } else if (prompt.length > STUDIO_LIMITS.soundPrompt) {
    errors.prompt = `Keep the prompt under ${STUDIO_LIMITS.soundPrompt} characters.`
  }
  if (
    !Number.isInteger(input.durationSeconds) ||
    input.durationSeconds < STUDIO_LIMITS.soundDurationMin ||
    input.durationSeconds > STUDIO_LIMITS.soundDurationMax
  ) {
    errors.durationSeconds = "Duration must be a whole number from 1 to 30 seconds."
  }
  return errors
}

export function validateSpeechInput(input: SpeechInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const text = input.text.trim()
  if (!text) {
    errors.text = "Enter the text to speak."
  } else if (text.length > STUDIO_LIMITS.speechText) {
    errors.text = `Text must stay under ${STUDIO_LIMITS.speechText.toLocaleString("en-US")} characters.`
  }
  if (!input.voiceId) {
    errors.voiceId = "Pick a voice."
  }
  if (input.format === "mp3" && text.length > STUDIO_LIMITS.speechMp3Text) {
    errors.format =
      "MP3 is only available up to 5,000 characters; longer text streams as WAV."
  }
  if (
    input.speed !== undefined &&
    (input.speed < STUDIO_LIMITS.speechSpeedMin ||
      input.speed > STUDIO_LIMITS.speechSpeedMax)
  ) {
    errors.speed = "Speed must be between 0.5 and 2."
  }
  if ((input.targetLang?.length ?? 0) > STUDIO_LIMITS.speechLang) {
    errors.targetLang = "Language codes are at most 10 characters."
  }
  return errors
}

export function validateVoiceDesignInput(
  input: VoiceDesignInput
): Record<string, string> {
  const errors: Record<string, string> = {}
  const description = input.voiceDescription.trim()
  if (description.length < STUDIO_LIMITS.voiceDescriptionMin) {
    errors.voiceDescription = `Describe the voice in at least ${STUDIO_LIMITS.voiceDescriptionMin} characters.`
  } else if (description.length > STUDIO_LIMITS.voiceDescriptionMax) {
    errors.voiceDescription = `Keep the description under ${STUDIO_LIMITS.voiceDescriptionMax} characters.`
  }
  if (
    input.guidanceScale !== undefined &&
    (input.guidanceScale < 0 || input.guidanceScale > 100)
  ) {
    errors.guidanceScale = "Guidance must be between 0 and 100."
  }
  if (
    input.loudness !== undefined &&
    (input.loudness < -1 || input.loudness > 1)
  ) {
    errors.loudness = "Loudness must be between -1 and 1."
  }
  return errors
}

export function validateVoiceCloneInput(
  input: Omit<VoiceCloneInput, "permissionConfirmed"> & {
    permissionConfirmed: boolean
  }
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.uploadId) {
    errors.uploadId = "Upload a voice sample first."
  }
  const name = input.name.trim()
  if (!name) {
    errors.name = "Name the voice."
  } else if (name.length > STUDIO_LIMITS.voiceCloneName) {
    errors.name = `Names are limited to ${STUDIO_LIMITS.voiceCloneName} characters.`
  }
  if (!input.permissionConfirmed) {
    errors.permissionConfirmed =
      "Confirm you have the person's permission to clone this voice."
  }
  return errors
}
