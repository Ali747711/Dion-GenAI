/**
 * Types mirroring API_CONTRACT.md (Music Studio R1 + R2).
 * Keep in sync with the backend contract; do not invent fields.
 */

import type {
  AssetSource,
  BillingGroup,
  CoverInput,
  EmotionInput,
  JobResult,
  LyricsRecognitionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  UsdUsage,
  VoiceCloneInput,
  VoiceDesignInput,
} from "@/lib/api/studio-types"

export type JobKind =
  | "music"
  | "cover"
  | "lyrics_recognition"
  | "sound"
  | "speech"
  | "emotion_enhance"
  | "voice_design"
  | "voice_clone"
  | "transcription"

export type JobInput =
  | MusicInput
  | CoverInput
  | LyricsRecognitionInput
  | SoundInput
  | SpeechInput
  | EmotionInput
  | VoiceDesignInput
  | VoiceCloneInput
  | TranscriptionInput

export type JobStatus =
  | "queued"
  | "submitting"
  | "submitted"
  | "running"
  | "partially_succeeded"
  | "succeeded"
  | "failed"
  | "submission_unknown"
  | "reconciliation_required"
  | "cancelled_before_submission"

export type VariantStatus =
  "pending" | "running" | "succeeded" | "failed" | "unknown"

export type ErrorClass =
  | "invalid_credentials"
  | "insufficient_funds"
  | "rate_limited"
  | "invalid_input"
  | "provider_unavailable"
  | "result_expired"
  | "ambiguous_submission"
  | "polling_failed"
  | "generation_failed"
  | "storage_failed"

export interface MusicInput {
  prompt: string
  lyricsMode: "lyrics" | "generate"
  lyrics?: string
  lyricsPrompt?: string
  title?: string
  tags?: string[]
  negativeTags?: string[]
  vocalGender?: "male" | "female" | null
}

export interface Estimate {
  kind: JobKind
  billing: BillingGroup
  /** Credit kinds only; null for usd kinds. */
  credits: number | null
  /** USD kinds only (decimal string); null when the price is undocumented. */
  usd: string | null
  assumption: string
  pricingVersion: string
  verified: boolean
  availableCredits: number
  /** cap − month confirmed − pending (decimal string). */
  availableUsd: string
  expiresAt: string
}

export interface Variant {
  id: string
  index: 0 | 1
  providerProductId: string | null
  status: VariantStatus
  rawStatus: string | null
  durationSeconds: number | null
  progress: number | null
  assetId: string | null
  errorMessage: string | null
}

export interface Job {
  id: string
  kind: JobKind
  status: JobStatus
  billing: BillingGroup
  input: JobInput
  projectId: string | null
  estimateCredits: number
  chargedCredits: number | null
  estimateUsd: string | null
  chargedUsd: string | null
  /** Text/structured outputs; audio outputs stay in variants[]. */
  result: JobResult | null
  pricingVersion: string
  providerTaskId: string | null
  errorClass: ErrorClass | null
  errorMessage: string | null
  attempts: number
  variants: Variant[]
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  completedAt: string | null
}

export interface Asset {
  id: string
  kind: "audio"
  source: AssetSource
  title: string
  jobId: string | null
  variantId: string | null
  variantIndex: 0 | 1 | null
  siblingAssetId: string | null
  projectId: string | null
  projectName: string | null
  mimeType: string
  bytes: number
  durationSeconds: number | null
  favorite: boolean
  archived: boolean
  lyrics: string | null
  prompt: string | null
  tags: string[]
  createdAt: string
  contentUrl: string
  downloadUrl: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  archived: boolean
  assetCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends Project {
  assets: Asset[]
}

export interface LedgerEntry {
  id: string
  jobId: string | null
  kind:
    | "allocation"
    | "reservation"
    | "reservation_release"
    | "charge"
    | "adjustment"
  /** May be 0 for usd entries; usdEstimate carries the amount then. */
  credits: number
  usdEstimate: string | null
  currency: "credits" | "usd"
  source: "owner" | "app" | "provider" | "reconciliation"
  pricingVersion: string | null
  note: string | null
  createdAt: string
}

export type UsageWarning =
  | "low_budget"
  | "unverified_pricing"
  | "stale_reconciliation"
  | "pending_reconciliation"
  | "usd_cap_unset"

export interface UsageEnvelope {
  key: "music" | "supporting" | "validation"
  label: string
  allocated: number
  confirmedCredits: number
  pendingCredits: number
}

export interface Usage {
  startingAllocation: number
  reserveCredits: number
  envelopes: UsageEnvelope[]
  adjustmentsCredits: number
  confirmedCredits: number
  pendingCredits: number
  estimatedRemaining: number
  lastReconciledAt: string | null
  providerBalance: null
  /** Pay-as-you-go cash budget (R2). */
  usd: UsdUsage
  warnings: UsageWarning[]
  byDay: { date: string; credits: number }[]
}

export type CapabilityKey =
  | "music"
  | "cover"
  | "sound"
  | "speech"
  | "voices"
  | "transcribe"
  | "media"
  | "workflows"

export interface Capability {
  key: CapabilityKey
  label: string
  release: "R1" | "R2" | "R3" | "R4"
  available: boolean
  reason: string | null
  limits?: Record<string, unknown>
}

export interface SessionInfo {
  authenticated: boolean
  owner: { name: string } | null
  csrfToken: string
}

export interface ConnectionInfo {
  mode: "mock" | "live"
  status: "configured" | "missing" | "unavailable"
  checkedAt: string
}

export interface BudgetConfig {
  startingAllocation: number
  reserveCredits: number
  envelopes: { key: string; label: string; allocated: number }[]
  maxConcurrentPaidJobs: number
  /** Decimal string, default "0.00". 0 disables all USD (cash) kinds. */
  usdMonthlyCap: string
}

export interface ListResponse<T> {
  data: T[]
  nextCursor: string | null
}

export interface ApiErrorBody {
  code: string
  message: string
  requestId: string
  retryable: boolean
  fields?: Record<string, string>
}

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  "partially_succeeded",
  "succeeded",
  "failed",
  "submission_unknown",
  "reconciliation_required",
  "cancelled_before_submission",
]

export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status)
}
