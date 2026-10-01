export enum JobKind {
  MUSIC = "music",
  COVER = "cover",
  LYRICS_RECOGNITION = "lyrics_recognition",
  SOUND = "sound",
  SPEECH = "speech",
  EMOTION_ENHANCE = "emotion_enhance",
  VOICE_DESIGN = "voice_design",
  VOICE_CLONE = "voice_clone",
  TRANSCRIPTION = "transcription",
}

export enum BillingGroup {
  CREDITS = "credits",
  USD = "usd",
}

export enum JobStatus {
  QUEUED = "queued",
  SUBMITTING = "submitting",
  SUBMITTED = "submitted",
  RUNNING = "running",
  PARTIALLY_SUCCEEDED = "partially_succeeded",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  SUBMISSION_UNKNOWN = "submission_unknown",
  RECONCILIATION_REQUIRED = "reconciliation_required",
  CANCELLED_BEFORE_SUBMISSION = "cancelled_before_submission",
}

export enum VariantStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  UNKNOWN = "unknown",
}

export enum ErrorClass {
  INVALID_CREDENTIALS = "invalid_credentials",
  INSUFFICIENT_FUNDS = "insufficient_funds",
  RATE_LIMITED = "rate_limited",
  INVALID_INPUT = "invalid_input",
  PROVIDER_UNAVAILABLE = "provider_unavailable",
  RESULT_EXPIRED = "result_expired",
  AMBIGUOUS_SUBMISSION = "ambiguous_submission",
  POLLING_FAILED = "polling_failed",
  GENERATION_FAILED = "generation_failed",
  STORAGE_FAILED = "storage_failed",
}

export enum LedgerKind {
  ALLOCATION = "allocation",
  RESERVATION = "reservation",
  RESERVATION_RELEASE = "reservation_release",
  CHARGE = "charge",
  ADJUSTMENT = "adjustment",
}

export enum LedgerSource {
  OWNER = "owner",
  APP = "app",
  PROVIDER = "provider",
  RECONCILIATION = "reconciliation",
}

export enum OutboxStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  DONE = "done",
  DEAD = "dead",
  CANCELLED = "cancelled",
}

export enum BudgetEnvelopeKey {
  MUSIC = "music",
  SUPPORTING = "supporting",
  VALIDATION = "validation",
}

export enum LedgerCurrency {
  CREDITS = "credits",
  USD = "usd",
}

export enum UploadPurpose {
  COVER_SOURCE = "cover_source",
  VOICE_SAMPLE = "voice_sample",
  TRANSCRIPTION = "transcription",
}

export enum UploadStatus {
  READY = "ready",
  CONSUMED = "consumed",
  EXPIRED = "expired",
}

export enum VoiceType {
  BUILT_IN = "built-in",
  CUSTOM = "custom",
  DESIGNED = "designed",
}

export enum VoiceDeletionStatus {
  ACTIVE = "active",
  DELETING = "deleting",
  DELETED = "deleted",
  DELETE_FAILED = "delete_failed",
}

export enum AssetSource {
  MUSIC = "music",
  COVER = "cover",
  SOUND = "sound",
  SPEECH = "speech",
  VOICE_PREVIEW = "voice_preview",
}

/** Kinds that reserve/settle in credits vs USD PAYGO cash (API_CONTRACT.md § R2 billing groups). */
export const JOB_BILLING_GROUP: Record<JobKind, BillingGroup> = {
  [JobKind.MUSIC]: BillingGroup.CREDITS,
  [JobKind.COVER]: BillingGroup.CREDITS,
  [JobKind.LYRICS_RECOGNITION]: BillingGroup.CREDITS,
  [JobKind.SOUND]: BillingGroup.USD,
  [JobKind.SPEECH]: BillingGroup.USD,
  [JobKind.EMOTION_ENHANCE]: BillingGroup.USD,
  [JobKind.VOICE_DESIGN]: BillingGroup.USD,
  [JobKind.VOICE_CLONE]: BillingGroup.USD,
  [JobKind.TRANSCRIPTION]: BillingGroup.USD,
};

/** Kinds processed via the async submit-then-poll pipeline vs a single synchronous worker tick. */
export const ASYNC_JOB_KINDS = new Set<JobKind>([JobKind.MUSIC, JobKind.COVER]);
