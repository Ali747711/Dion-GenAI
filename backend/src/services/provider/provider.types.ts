import type { ErrorClass } from "../../libs/enums/job.enum";
import type { MusicInput } from "../../libs/types/music";

export interface ProviderVariantHandle {
  index: 0 | 1;
  providerProductId: string;
}

export interface ProviderSubmitResult {
  variants: ProviderVariantHandle[];
}

export interface ProviderPollResult {
  status: "running" | "succeeded" | "failed" | "unknown";
  rawStatus: string;
  durationSeconds: number | null;
  progress: number | null;
  /** Local filesystem path or remote URL to download the finished audio from. */
  resultLocation: string | null;
  errorMessage: string | null;
}

export interface PollContext {
  submittedAt: Date;
  index: 0 | 1;
}

/** Thrown when a submit POST times out / connection is lost: submission_unknown, never auto-retried. */
export class ProviderTimeoutError extends Error {
  constructor(message = "Provider request timed out before a response was received") {
    super(message);
    this.name = "ProviderTimeoutError";
  }
}

/** A definitive business-level failure reported by the provider (even under HTTP 200). */
export class ProviderBusinessError extends Error {
  public readonly errorClass: ErrorClass;

  constructor(message: string, errorClass: ErrorClass) {
    super(message);
    this.name = "ProviderBusinessError";
    this.errorClass = errorClass;
  }
}

/** A transient failure worth retrying with backoff (network blip, 5xx, rate limit). */
export class ProviderTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderTransientError";
  }
}

export interface MusicProviderAdapter {
  readonly mode: "mock" | "live";
  submit(input: MusicInput): Promise<ProviderSubmitResult>;
  poll(providerProductId: string, context: PollContext): Promise<ProviderPollResult>;
}
