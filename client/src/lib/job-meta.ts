import type { ErrorClass, JobStatus, VariantStatus } from "@/lib/api/types"

export type BadgeTone = "default" | "secondary" | "destructive" | "outline"

interface StatusMeta {
  label: string
  tone: BadgeTone
  description?: string
}

export const JOB_STATUS_META: Record<JobStatus, StatusMeta> = {
  queued: { label: "Queued", tone: "secondary" },
  submitting: { label: "Submitting", tone: "secondary" },
  submitted: { label: "Submitted", tone: "secondary" },
  running: { label: "Running", tone: "default" },
  partially_succeeded: {
    label: "Partial",
    tone: "outline",
    description:
      "One variant succeeded and one failed. Billing for this pair stays unreconciled until the actual charge is established.",
  },
  succeeded: { label: "Succeeded", tone: "default" },
  failed: { label: "Failed", tone: "destructive" },
  submission_unknown: {
    label: "Submission unknown",
    tone: "destructive",
    description:
      "The request may or may not have reached the provider. Nothing was retried automatically, and the reservation is kept until the outcome is confirmed — resubmitting now could pay twice.",
  },
  reconciliation_required: {
    label: "Needs reconciliation",
    tone: "destructive",
    description:
      "The final charge for this job is uncertain. Its reservation stays pending until you record the confirmed amount from provider evidence.",
  },
  cancelled_before_submission: {
    label: "Cancelled",
    tone: "outline",
    description: "Cancelled before dispatch. No provider request was made.",
  },
}

export const VARIANT_STATUS_META: Record<VariantStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "secondary" },
  running: { label: "Running", tone: "default" },
  succeeded: { label: "Ready", tone: "default" },
  failed: { label: "Failed", tone: "destructive" },
  unknown: { label: "Unknown", tone: "outline" },
}

/** Actionable, honest guidance per error class (PRD F4). */
export const ERROR_CLASS_MESSAGES: Record<ErrorClass, string> = {
  invalid_credentials:
    "The provider rejected the configured API key. Check the backend credentials in Settings — no retry will help until the key is fixed.",
  insufficient_funds:
    "The provider reported insufficient funds. Verify the account balance before submitting again; local budget numbers are estimates only.",
  rate_limited:
    "The provider rate limit was hit. The worker backs off automatically; wait a moment before submitting new work.",
  invalid_input:
    "The provider rejected the request input. Adjust the prompt or lyrics and submit a new job — this one will not be retried.",
  provider_unavailable:
    "The provider is currently unreachable. The job can be retried as a new submission once the provider recovers.",
  result_expired:
    "The generated result expired before it could be stored. A new generation (a new paid submission) is required.",
  ambiguous_submission:
    "The submission outcome is ambiguous. Nothing was resubmitted automatically to avoid a double charge — reconcile against provider evidence first.",
  polling_failed:
    "Status polling failed, which is different from the generation failing. The job may still complete; the worker will resume polling.",
  generation_failed:
    "The provider reported the generation failed. Review the message below; retrying is a new, explicitly submitted job.",
  storage_failed:
    "The result was generated but storing it failed. The worker retries the download — no new generation charge is involved.",
}

/**
 * Error classes whose message above names a real recovery action the owner
 * can take now (wait and retry, adjust input, resubmit). Billing-uncertain
 * and credential states are deliberately excluded.
 */
export const RECOVERABLE_ERROR_CLASSES: ReadonlySet<ErrorClass> = new Set([
  "rate_limited",
  "invalid_input",
  "provider_unavailable",
  "polling_failed",
])

export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  "queued",
  "submitting",
  "submitted",
  "running",
]
