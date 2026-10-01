import path from "node:path";

import { ErrorClass } from "../../src/libs/enums/job.enum";
import type {
  CoverInput,
  EmotionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  VoiceCloneInput,
  VoiceDesignInput,
} from "../../src/libs/types/audioStudio";
import { writeSineWav } from "../../src/libs/utils/wavWriter";
import type {
  AudioBinaryResult,
  AudioStudioProviderAdapter,
  CoverPollResult,
  CoverSubmitResult,
  EmotionEnhanceResult,
  ProviderVoiceSummary,
  RecognizeLyricsResult,
  SoundHistoryItem,
  TranscribeResult,
  VoiceCloneResult,
  VoiceDesignResult,
} from "../../src/services/provider/audioStudio.types";
import { ProviderBusinessError, ProviderTimeoutError, ProviderTransientError } from "../../src/services/provider/provider.types";

type SubmitBehavior = "succeed" | "timeout" | "business_error" | "transient_error";

export interface FakeCoverPollScript {
  status: "running" | "succeeded" | "failed" | "unknown";
  durationSeconds?: number | null;
}

/**
 * Fully scriptable test double for `AudioStudioProviderAdapter`. Mirrors
 * `FakeProvider` (the R1 music double) so R2 worker-path tests can exercise
 * settlement/failure logic instantly, without any network calls.
 */
export class FakeAudioStudioProvider implements AudioStudioProviderAdapter {
  public readonly mode = "mock" as const;

  public coverSubmitBehavior: SubmitBehavior = "succeed";
  /** index 0 | 1 -> queue of poll results (last one repeats). */
  public coverPollScripts: Record<0 | 1, FakeCoverPollScript[]> = { 0: [], 1: [] };
  public coverPollCallsByIndex = new Map<0 | 1, number>();

  public recognizeResult: RecognizeLyricsResult = { hasVocals: true, lyrics: "fake lyrics", charged: true };
  public emotionText = "[Happy#Joy:0.6]:fake";
  public voiceDesignPreviewCount = 2;
  public clonedVoiceId = "fake_cloned_voice";
  public transcribeResult: Omit<TranscribeResult, "durationSeconds"> = {
    language: "en",
    transcript: "fake transcript",
    segments: [{ text: "fake transcript", start: 0, end: 1, speaker: 0 }],
  };

  public async submitCover(_input: CoverInput, _sourceBuffer: Buffer, _sourceMimeType: string): Promise<CoverSubmitResult> {
    if (this.coverSubmitBehavior === "timeout") throw new ProviderTimeoutError();
    if (this.coverSubmitBehavior === "business_error") throw new ProviderBusinessError("Invalid API key", ErrorClass.INVALID_CREDENTIALS);
    if (this.coverSubmitBehavior === "transient_error") throw new ProviderTransientError("connection reset");
    return { taskId: "fake_task" };
  }

  public async pollCover(_taskId: string, _context: { submittedAt: Date }): Promise<CoverPollResult> {
    const variants = ([0, 1] as const).map((index) => {
      const count = this.coverPollCallsByIndex.get(index) ?? 0;
      this.coverPollCallsByIndex.set(index, count + 1);
      const script = this.coverPollScripts[index];
      const step = script[Math.min(count, script.length - 1)];
      if (!step) {
        return { index, providerProductId: `fake_${index}`, status: "running" as const, rawStatus: "processing", durationSeconds: null, resultLocation: null, errorMessage: null };
      }
      return {
        index,
        providerProductId: `fake_${index}`,
        status: step.status,
        rawStatus: step.status,
        durationSeconds: step.durationSeconds ?? null,
        resultLocation: step.status === "succeeded" ? FAKE_AUDIO_PATH : null,
        errorMessage: step.status === "failed" ? "boom" : null,
      };
    });
    const allTerminal = variants.every((v) => v.status === "succeeded" || v.status === "failed");
    return { status: allTerminal ? "succeeded" : "running", rawStatus: allTerminal ? "succeeded" : "processing", stage: null, variants };
  }

  public async recognizeLyrics(_sourceBuffer: Buffer, _sourceMimeType: string, _idempotencyKey: string): Promise<RecognizeLyricsResult> {
    return this.recognizeResult;
  }

  public async textToSound(input: SoundInput): Promise<AudioBinaryResult> {
    return { buffer: writeSineWav(input.durationSeconds), mimeType: "audio/wav", durationSeconds: input.durationSeconds };
  }

  public async textToSpeech(input: SpeechInput, _voiceProviderId: string): Promise<AudioBinaryResult> {
    const durationSeconds = Math.max(1, input.text.length / 15);
    return { buffer: writeSineWav(durationSeconds), mimeType: "audio/wav", durationSeconds };
  }

  public async emotionEnhance(_input: EmotionInput): Promise<EmotionEnhanceResult> {
    return { text: this.emotionText };
  }

  public async voiceDesign(_input: VoiceDesignInput): Promise<VoiceDesignResult> {
    return {
      previews: Array.from({ length: this.voiceDesignPreviewCount }, (_, i) => ({
        providerVoiceId: `fake_designed_${i}`,
        audioBuffer: writeSineWav(1),
      })),
      features: { gender: "female", age: "adult", language: "en" },
    };
  }

  public async cloneVoice(_input: VoiceCloneInput, _sourceBuffer: Buffer, _sourceMimeType: string): Promise<VoiceCloneResult> {
    return { providerVoiceId: this.clonedVoiceId, previewBuffer: null };
  }

  public async transcribe(
    _input: TranscriptionInput,
    _sourceBuffer: Buffer,
    _sourceMimeType: string,
    durationSeconds: number
  ): Promise<TranscribeResult> {
    return { ...this.transcribeResult, durationSeconds };
  }

  public async listBuiltInVoices(): Promise<ProviderVoiceSummary[]> {
    return [{ providerVoiceId: "fake_builtin_1", name: "Fake Voice", labels: null, language: "en" }];
  }

  public async deleteVoice(_providerVoiceId: string): Promise<{ deleted: boolean }> {
    return { deleted: true };
  }

  public async listSoundHistory(_skip: number, _limit: number): Promise<SoundHistoryItem[]> {
    return [];
  }

  public async deleteSoundHistoryItem(_genProductId: string): Promise<void> {}
}

const FAKE_AUDIO_PATH = path.join(__dirname, "..", "fixtures", "sample-audio.bin");
