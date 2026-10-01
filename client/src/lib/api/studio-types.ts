/**
 * R2 Audio Studio types mirroring API_CONTRACT.md ("R2 — Audio Studio").
 * Keep in sync with the backend contract; do not invent fields.
 */

export type BillingGroup = "credits" | "usd"

export type UploadPurpose = "cover_source" | "voice_sample" | "transcription"

export interface Upload {
  id: string
  purpose: UploadPurpose
  filename: string
  mimeType: string
  bytes: number
  durationSeconds: number | null
  expiresAt: string
  createdAt: string
}

export type VoiceType = "built-in" | "custom" | "designed"

export interface Voice {
  id: string
  providerVoiceId: string
  name: string
  type: VoiceType
  labels: string | null
  language: string | null
  previewUrl: string | null
  permissionConfirmedAt: string | null
  deletionStatus: "active" | "deleting" | "deleted" | "delete_failed"
  createdAt: string
}

// --- Job inputs -------------------------------------------------------------

export interface CoverInput {
  uploadId: string
  lyrics: string
  melodyAdherence: "high" | "main_melody"
  musicDescription?: string
  style?: string
  title?: string
  vocalGender?: "male" | "female" | null
  rightsConfirmed: true
}

export interface LyricsRecognitionInput {
  uploadId: string
}

export interface SoundInput {
  prompt: string
  durationSeconds: number
  format: "wav" | "mp3"
}

export interface SpeechInput {
  text: string
  voiceId: string
  format: "wav" | "mp3"
  speed?: number
  targetLang?: string
  trimSilence?: boolean
}

export interface EmotionInput {
  text: string
}

export interface VoiceDesignInput {
  voiceDescription: string
  guidanceScale?: number
  loudness?: number
  name?: string
}

export interface VoiceCloneInput {
  uploadId: string
  name: string
  language?: string
  denoise?: boolean
  permissionConfirmed: true
}

export interface TranscriptionInput {
  uploadId: string
  language?: string
}

// --- Job results ------------------------------------------------------------

export interface TranscriptSegment {
  text: string
  start: number
  end: number
  speaker: number | null
}

export type JobResult =
  | { kind: "lyrics_recognition"; hasVocals: boolean; lyrics: string }
  | { kind: "emotion_enhance"; text: string }
  | {
      kind: "transcription"
      language: string
      transcript: string
      durationSeconds: number
      segments: TranscriptSegment[]
    }
  | {
      kind: "voice_design"
      voiceIds: string[]
      features: Record<string, string> | null
    }
  | { kind: "voice_clone"; voiceId: string }

export type AssetSource = "music" | "cover" | "sound" | "speech" | "voice_preview"

export interface UsdUsage {
  monthlyCap: string
  confirmedThisMonth: string
  pending: string
  available: string
}
