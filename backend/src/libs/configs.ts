export const PRICING_VERSION = "noiz-music-2026-09-30";
export const CREDITS_PER_SECOND = 15;
export const DEFAULT_ASSUMED_DURATION_SECONDS = 180;
export const DEFAULT_ESTIMATE_CREDITS = Math.ceil(DEFAULT_ASSUMED_DURATION_SECONDS * CREDITS_PER_SECOND); // 2700
export const ESTIMATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const MAX_CONCURRENT_PAID_JOBS = 1;
/** R2: at most 1 in-flight job per billing group (credits, usd) rather than globally. */
export const MAX_CONCURRENT_PAID_JOBS_PER_GROUP = 1;

// --- R2 pricing (API_CONTRACT.md § Billing groups and policy / NOIZ_R2_CONTRACTS.md) ---
export const LYRICS_RECOGNITION_ESTIMATE_CREDITS = 100;
export const SOUND_USD_PER_SECOND = 0.001;
export const SPEECH_USD_PER_CHAR = 0.000015; // $15 / 1,000,000 chars
export const VOICE_DESIGN_USD_PER_GENERATION = 0.3;
export const TRANSCRIPTION_USD_PER_SECOND = 0.0006;
export const SPEECH_STREAM_CHAR_THRESHOLD = 5000;
export const DEFAULT_USD_MONTHLY_CAP = "0.00";

export const UPLOAD_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
export const VOICE_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const BUILT_IN_VOICE_COUNT_MOCK = 6;

export interface UploadLimit {
  types: string[];
  maxBytes: number;
  maxDurationSeconds: number | null;
}

export const UPLOAD_LIMITS: Record<string, UploadLimit> = {
  cover_source: {
    types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac", "audio/mp4", "audio/aac", "audio/ogg"],
    maxBytes: 100 * 1024 * 1024,
    maxDurationSeconds: null,
  },
  voice_sample: {
    types: ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4"],
    maxBytes: 20 * 1024 * 1024,
    maxDurationSeconds: 60,
  },
  transcription: {
    types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/flac", "audio/x-flac", "audio/aac", "audio/webm"],
    maxBytes: 50 * 1024 * 1024,
    maxDurationSeconds: 600,
  },
};

export const JOB_IN_FLIGHT_STATUSES = ["queued", "submitting", "submitted", "running"] as const;

export const JOB_TERMINAL_STATUSES = [
  "partially_succeeded",
  "succeeded",
  "failed",
  "submission_unknown",
  "reconciliation_required",
  "cancelled_before_submission",
] as const;

export const RESERVATION_OPEN_STATUSES = [
  "queued",
  "submitting",
  "submitted",
  "running",
  "submission_unknown",
  "reconciliation_required",
] as const;

export const REQUEST_ID_HEADER = "X-Request-Id";
export const CSRF_HEADER = "X-CSRF-Token";
export const SESSION_COOKIE_NAME = "ms_sid";

export const JSON_BODY_LIMIT = "100kb";

export const BUDGET_ADVISORY_LOCK_KEY = 872_364_501; // arbitrary fixed key for pg_advisory_xact_lock

export const LOW_BUDGET_WARNING_THRESHOLD = 5000; // estimatedRemaining below this triggers `low_budget`
export const STALE_RECONCILIATION_DAYS = 7;

export function shapeUuid(value: string): string {
  return value.trim();
}
