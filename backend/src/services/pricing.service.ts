import {
  CREDITS_PER_SECOND,
  DEFAULT_ASSUMED_DURATION_SECONDS,
  DEFAULT_ESTIMATE_CREDITS,
  LYRICS_RECOGNITION_ESTIMATE_CREDITS,
  SOUND_USD_PER_SECOND,
  SPEECH_USD_PER_CHAR,
  TRANSCRIPTION_USD_PER_SECOND,
  VOICE_DESIGN_USD_PER_GENERATION,
} from "../libs/configs";
import { JobKind } from "../libs/enums/job.enum";
import type { SoundInput, SpeechInput } from "../libs/types/audioStudio";
import type { JobInput } from "../libs/types/job";
import { usdFromNumber } from "../libs/utils/decimal";

export interface PricingResult {
  credits: number | null;
  usd: string | null;
  assumption: string;
  /** Whether this pricing has been independently verified against a live account (always false today — PRD §11). */
  verified: boolean;
}

/**
 * Preflight/settlement pricing per API_CONTRACT.md § "Billing groups and
 * policy" (backed by NOIZ_R2_CONTRACTS.md's pricing table). Single source of
 * truth shared by the estimator, job reservation, and settlement.
 */
export function priceJob(kind: JobKind, input: JobInput, context: { uploadDurationSeconds?: number | null } = {}): PricingResult {
  switch (kind) {
    case JobKind.MUSIC:
    case JobKind.COVER:
      return {
        credits: DEFAULT_ESTIMATE_CREDITS,
        usd: null,
        assumption: `Assumes ${DEFAULT_ASSUMED_DURATION_SECONDS} s longest variant × ${CREDITS_PER_SECOND} credits/s; final charge depends on actual duration.`,
        verified: false,
      };

    case JobKind.LYRICS_RECOGNITION:
      return {
        credits: LYRICS_RECOGNITION_ESTIMATE_CREDITS,
        usd: null,
        assumption: `Charged ${LYRICS_RECOGNITION_ESTIMATE_CREDITS} credits only if the source has vocals; no charge otherwise.`,
        verified: false,
      };

    case JobKind.SOUND: {
      const duration = (input as SoundInput).durationSeconds;
      return {
        credits: null,
        usd: usdFromNumber(duration * SOUND_USD_PER_SECOND),
        assumption: `$${SOUND_USD_PER_SECOND}/s × ${duration}s requested duration.`,
        verified: false,
      };
    }

    case JobKind.SPEECH: {
      const chars = (input as SpeechInput).text.length;
      return {
        credits: null,
        usd: usdFromNumber(chars * SPEECH_USD_PER_CHAR),
        assumption: `$15 / 1,000,000 chars × ${chars} chars.`,
        verified: false,
      };
    }

    case JobKind.VOICE_DESIGN:
      return {
        credits: null,
        usd: usdFromNumber(VOICE_DESIGN_USD_PER_GENERATION),
        assumption: `Flat $${VOICE_DESIGN_USD_PER_GENERATION.toFixed(2)} per generation.`,
        verified: false,
      };

    case JobKind.TRANSCRIPTION: {
      const duration = context.uploadDurationSeconds ?? 0;
      return {
        credits: null,
        usd: usdFromNumber(duration * TRANSCRIPTION_USD_PER_SECOND),
        assumption: `$${TRANSCRIPTION_USD_PER_SECOND}/s × ${duration}s upload duration.`,
        verified: false,
      };
    }

    case JobKind.EMOTION_ENHANCE:
    case JobKind.VOICE_CLONE:
      return {
        credits: null,
        usd: null,
        assumption: "Price not documented by the provider; settles with usd: null pending manual reconciliation.",
        verified: false,
      };

    default:
      return { credits: null, usd: null, assumption: "Unknown job kind", verified: false };
  }
}
