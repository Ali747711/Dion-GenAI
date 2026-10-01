import { ErrorClass } from "../../src/libs/enums/job.enum";
import type { MusicInput } from "../../src/libs/types/music";
import {
  ProviderBusinessError,
  ProviderTimeoutError,
  ProviderTransientError,
  type MusicProviderAdapter,
  type PollContext,
  type ProviderPollResult,
  type ProviderSubmitResult,
} from "../../src/services/provider/provider.types";

type SubmitBehavior = "succeed" | "timeout" | "business_error" | "transient_error";

export interface PollScript {
  status: ProviderPollResult["status"];
  durationSeconds?: number | null;
  resultLocation?: string | null;
  errorMessage?: string | null;
}

/**
 * Fully scriptable test double for `MusicProviderAdapter`. Never touches the
 * network — used to exercise worker paths (submission_unknown, business
 * errors, transient retries, partial failure) that the real mock provider
 * never produces on its own.
 */
export class FakeProvider implements MusicProviderAdapter {
  public readonly mode = "mock" as const;
  public submitBehavior: SubmitBehavior = "succeed";
  public submitCalls = 0;
  public pollCallsByVariant = new Map<string, number>();
  /** index 0 | 1 -> queue of poll results to return in order (last one repeats). */
  public pollScripts: Record<0 | 1, PollScript[]> = { 0: [], 1: [] };

  public async submit(_input: MusicInput): Promise<ProviderSubmitResult> {
    this.submitCalls += 1;
    if (this.submitBehavior === "timeout") throw new ProviderTimeoutError();
    if (this.submitBehavior === "business_error") {
      throw new ProviderBusinessError("Invalid API key", ErrorClass.INVALID_CREDENTIALS);
    }
    if (this.submitBehavior === "transient_error") throw new ProviderTransientError("connection reset");

    return {
      variants: [
        { index: 0, providerProductId: `fake_0_${this.submitCalls}` },
        { index: 1, providerProductId: `fake_1_${this.submitCalls}` },
      ],
    };
  }

  public async poll(providerProductId: string, context: PollContext): Promise<ProviderPollResult> {
    const count = this.pollCallsByVariant.get(providerProductId) ?? 0;
    this.pollCallsByVariant.set(providerProductId, count + 1);

    const script = this.pollScripts[context.index];
    const step = script[Math.min(count, script.length - 1)];
    if (!step) {
      return { status: "running", rawStatus: "processing", durationSeconds: null, progress: 50, resultLocation: null, errorMessage: null };
    }

    return {
      status: step.status,
      rawStatus: step.status,
      durationSeconds: step.durationSeconds ?? null,
      progress: step.status === "succeeded" ? 100 : 50,
      resultLocation: step.resultLocation ?? null,
      errorMessage: step.errorMessage ?? null,
    };
  }
}
