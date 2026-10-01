import { randomUUID } from "node:crypto";

import { BUILT_IN_VOICE_COUNT_MOCK } from "../../libs/configs";
import type {
  CoverInput,
  EmotionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  VoiceCloneInput,
  VoiceDesignInput,
} from "../../libs/types/audioStudio";
import type { MusicInput } from "../../libs/types/music";
import { writeSineWav } from "../../libs/utils/wavWriter";
import type {
  AudioBinaryResult,
  AudioStudioProviderAdapter,
  CoverPollResult,
  CoverSubmitResult,
  CoverVariantResult,
  EmotionEnhanceResult,
  ProviderVoiceSummary,
  RecognizeLyricsResult,
  SoundHistoryItem,
  TranscribeResult,
  VoiceCloneResult,
  VoiceDesignResult,
} from "./audioStudio.types";
import { getMockAudioDurationSeconds, mockAudioSourcePath } from "./mockAudio";
import type { MusicProviderAdapter, PollContext, ProviderPollResult, ProviderSubmitResult } from "./provider.types";

const MOCK_BUILT_IN_VOICES: ProviderVoiceSummary[] = Array.from({ length: BUILT_IN_VOICE_COUNT_MOCK }, (_, i) => ({
  providerVoiceId: `mock_builtin_${i + 1}`,
  name: ["Aria", "Bram", "Cora", "Deshi", "Elin", "Farid"][i] ?? `Voice ${i + 1}`,
  labels: ["warm", "deep", "bright", "calm", "energetic", "soft"][i] ?? null,
  language: "en",
}));

const VARIANT_COMPLETION_WINDOWS_MS: Record<0 | 1, [number, number]> = {
  0: [15_000, 20_000],
  1: [19_000, 25_000],
};

/** Deterministic pseudo-random offset derived from a stable seed (so repeated polls agree). */
function pseudoRandomWithin(seed: string, [min, max]: [number, number]): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const span = Math.max(1, max - min);
  return min + (hash % span);
}

/**
 * Simulates Noiz's music generation without any network calls: submission
 * always succeeds with two variant ids; polling reports `running` until a
 * deterministic per-variant completion time (~15-25s after submission) has
 * elapsed, then `succeeded` using the repo's sample audio file as output.
 */
export class MockNoizProvider implements MusicProviderAdapter, AudioStudioProviderAdapter {
  public readonly mode = "mock" as const;

  public async submit(_input: MusicInput): Promise<ProviderSubmitResult> {
    return {
      variants: [
        { index: 0, providerProductId: `mock_${randomUUID()}` },
        { index: 1, providerProductId: `mock_${randomUUID()}` },
      ],
    };
  }

  public async poll(providerProductId: string, context: PollContext): Promise<ProviderPollResult> {
    const window = VARIANT_COMPLETION_WINDOWS_MS[context.index];
    const completionMs = pseudoRandomWithin(providerProductId, window);
    const elapsedMs = Date.now() - context.submittedAt.getTime();

    if (elapsedMs >= completionMs) {
      const durationSeconds = await getMockAudioDurationSeconds();
      return {
        status: "succeeded",
        rawStatus: "done",
        durationSeconds,
        progress: 100,
        resultLocation: mockAudioSourcePath(),
        errorMessage: null,
      };
    }

    const progress = Math.min(99, Math.round((elapsedMs / completionMs) * 100));
    return {
      status: "running",
      rawStatus: "processing",
      durationSeconds: null,
      progress,
      resultLocation: null,
      errorMessage: null,
    };
  }

  // --- R2: Audio Studio ---

  public async submitCover(_input: CoverInput, _sourceBuffer: Buffer, _sourceMimeType: string): Promise<CoverSubmitResult> {
    return { taskId: `mock_task_${randomUUID()}` };
  }

  public async pollCover(taskId: string, context: { submittedAt: Date }): Promise<CoverPollResult> {
    const elapsedMs = Date.now() - context.submittedAt.getTime();
    const durationSeconds = await getMockAudioDurationSeconds();

    const variants: CoverVariantResult[] = ([0, 1] as const).map((index) => {
      const window = VARIANT_COMPLETION_WINDOWS_MS[index];
      const completionMs = pseudoRandomWithin(`${taskId}_${index}`, window);
      if (elapsedMs >= completionMs) {
        return {
          index,
          providerProductId: `${taskId}_v${index}`,
          status: "succeeded",
          rawStatus: "succeeded",
          durationSeconds,
          resultLocation: mockAudioSourcePath(),
          errorMessage: null,
        };
      }
      return {
        index,
        providerProductId: `${taskId}_v${index}`,
        status: "running",
        rawStatus: "processing",
        durationSeconds: null,
        resultLocation: null,
        errorMessage: null,
      };
    });

    const allTerminal = variants.every((v) => v.status === "succeeded" || v.status === "failed");
    return { status: allTerminal ? "succeeded" : "running", rawStatus: allTerminal ? "succeeded" : "processing", stage: allTerminal ? "completed" : "score_pending", variants };
  }

  public async recognizeLyrics(_sourceBuffer: Buffer, _sourceMimeType: string, _idempotencyKey: string): Promise<RecognizeLyricsResult> {
    return {
      hasVocals: true,
      lyrics: "[Verse 1]\nMock recognized lyrics from the uploaded source track.\n[Chorus]\nSinging back what the source suggested.",
      charged: true,
    };
  }

  public async textToSound(input: SoundInput): Promise<AudioBinaryResult> {
    const buffer = writeSineWav(input.durationSeconds, { frequencyHz: 220 });
    return { buffer, mimeType: "audio/wav", durationSeconds: input.durationSeconds };
  }

  public async textToSpeech(input: SpeechInput, _voiceProviderId: string): Promise<AudioBinaryResult> {
    const speed = input.speed ?? 1;
    const durationSeconds = Math.max(1, input.text.length / 15 / speed);
    const buffer = writeSineWav(durationSeconds, { frequencyHz: 330 });
    return { buffer, mimeType: "audio/wav", durationSeconds };
  }

  public async emotionEnhance(input: EmotionInput): Promise<EmotionEnhanceResult> {
    return { text: `[Happy#Joy:0.6]:${input.text}` };
  }

  public async voiceDesign(input: VoiceDesignInput): Promise<VoiceDesignResult> {
    const previews = [0, 1].map((i) => ({
      providerVoiceId: `mock_designed_${randomUUID()}`,
      audioBuffer: writeSineWav(2, { frequencyHz: 300 + i * 80 }),
    }));
    return {
      previews,
      features: { gender: "female", age: "adult", language: "en", voicePrompt: input.voiceDescription.slice(0, 60) },
    };
  }

  public async cloneVoice(_input: VoiceCloneInput, _sourceBuffer: Buffer, _sourceMimeType: string): Promise<VoiceCloneResult> {
    return { providerVoiceId: `mock_cloned_${randomUUID()}`, previewBuffer: writeSineWav(2, { frequencyHz: 260 }) };
  }

  public async transcribe(
    input: TranscriptionInput,
    _sourceBuffer: Buffer,
    _sourceMimeType: string,
    durationSeconds: number
  ): Promise<TranscribeResult> {
    const language = input.language ?? "en";
    const segCount = durationSeconds > 20 ? 3 : 2;
    const segLen = durationSeconds / segCount;
    const segments = Array.from({ length: segCount }, (_, i) => ({
      text: `Mock transcribed segment ${i + 1}.`,
      start: Number((i * segLen).toFixed(2)),
      end: Number(((i + 1) * segLen).toFixed(2)),
      speaker: i % 2,
    }));
    const transcript = segments.map((s) => s.text).join(" ");
    return { language, transcript, durationSeconds, segments };
  }

  public async listBuiltInVoices(): Promise<ProviderVoiceSummary[]> {
    return MOCK_BUILT_IN_VOICES;
  }

  public async deleteVoice(_providerVoiceId: string): Promise<{ deleted: boolean }> {
    return { deleted: true };
  }

  public async listSoundHistory(_skip: number, _limit: number): Promise<SoundHistoryItem[]> {
    return [];
  }

  public async deleteSoundHistoryItem(_genProductId: string): Promise<void> {
    // Mock has no persisted provider-side history to delete.
  }
}
