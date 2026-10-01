import type {
  CoverInput,
  EmotionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  TranscriptSegment,
  VoiceCloneInput,
  VoiceDesignInput,
} from "../../libs/types/audioStudio";

export interface CoverSubmitResult {
  taskId: string;
}

export interface CoverVariantResult {
  index: 0 | 1;
  providerProductId: string | null;
  status: "running" | "succeeded" | "failed" | "unknown";
  rawStatus: string;
  durationSeconds: number | null;
  resultLocation: string | null;
  errorMessage: string | null;
}

export interface CoverPollResult {
  status: "running" | "succeeded" | "failed" | "unknown";
  rawStatus: string;
  stage: string | null;
  variants: CoverVariantResult[];
}

export interface RecognizeLyricsResult {
  hasVocals: boolean;
  lyrics: string;
  charged: boolean;
}

export interface AudioBinaryResult {
  buffer: Buffer;
  mimeType: string;
  durationSeconds: number;
}

export interface EmotionEnhanceResult {
  text: string;
}

export interface VoiceDesignPreview {
  providerVoiceId: string;
  audioBuffer: Buffer;
}

export interface VoiceDesignResult {
  previews: VoiceDesignPreview[];
  features: Record<string, string> | null;
}

export interface VoiceCloneResult {
  providerVoiceId: string;
  previewBuffer: Buffer | null;
}

export interface TranscribeResult {
  language: string;
  transcript: string;
  durationSeconds: number;
  segments: TranscriptSegment[];
}

export interface ProviderVoiceSummary {
  providerVoiceId: string;
  name: string;
  labels: string | null;
  language: string | null;
}

export interface SoundHistoryItem {
  genProductId: string;
  prompt: string;
  durationSeconds: number;
  createdAt: string;
}

/**
 * R2 provider surface (cover/lyrics-recognition/sound/speech/emotion/voice
 * design/voice clone/transcription/voices/sound-history). Implemented by the
 * same Mock/Live classes that implement `MusicProviderAdapter`, obtained
 * separately via `getAudioStudioProvider()` (see provider.factory.ts).
 */
export interface AudioStudioProviderAdapter {
  readonly mode: "mock" | "live";

  submitCover(input: CoverInput, sourceBuffer: Buffer, sourceMimeType: string): Promise<CoverSubmitResult>;
  pollCover(taskId: string, context: { submittedAt: Date }): Promise<CoverPollResult>;

  recognizeLyrics(sourceBuffer: Buffer, sourceMimeType: string, idempotencyKey: string): Promise<RecognizeLyricsResult>;

  textToSound(input: SoundInput): Promise<AudioBinaryResult>;
  textToSpeech(input: SpeechInput, voiceProviderId: string): Promise<AudioBinaryResult>;
  emotionEnhance(input: EmotionInput): Promise<EmotionEnhanceResult>;
  voiceDesign(input: VoiceDesignInput): Promise<VoiceDesignResult>;
  cloneVoice(input: VoiceCloneInput, sourceBuffer: Buffer, sourceMimeType: string): Promise<VoiceCloneResult>;
  transcribe(input: TranscriptionInput, sourceBuffer: Buffer, sourceMimeType: string, durationSeconds: number): Promise<TranscribeResult>;

  listBuiltInVoices(): Promise<ProviderVoiceSummary[]>;
  deleteVoice(providerVoiceId: string): Promise<{ deleted: boolean }>;

  listSoundHistory(skip: number, limit: number): Promise<SoundHistoryItem[]>;
  deleteSoundHistoryItem(genProductId: string): Promise<void>;
}
