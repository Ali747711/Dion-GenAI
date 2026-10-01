import type { VocalGender } from "./music";
import type { UUID } from "./common";

export interface CoverInput {
  uploadId: UUID;
  lyrics: string;
  melodyAdherence: "high" | "main_melody";
  musicDescription?: string;
  style?: string;
  title?: string;
  vocalGender?: VocalGender;
  rightsConfirmed: true;
}

export interface LyricsRecognitionInput {
  uploadId: UUID;
}

export interface SoundInput {
  prompt: string;
  durationSeconds: number;
  format: "wav" | "mp3";
}

export interface SpeechInput {
  text: string;
  voiceId: UUID;
  format: "wav" | "mp3";
  speed?: number;
  targetLang?: string;
  trimSilence?: boolean;
}

export interface EmotionInput {
  text: string;
}

export interface VoiceDesignInput {
  voiceDescription: string;
  guidanceScale?: number;
  loudness?: number;
  name?: string;
}

export interface VoiceCloneInput {
  uploadId: UUID;
  name: string;
  language?: string;
  denoise?: boolean;
  permissionConfirmed: true;
}

export interface TranscriptionInput {
  uploadId: UUID;
  language?: string;
}

export type AudioStudioInput =
  | CoverInput
  | LyricsRecognitionInput
  | SoundInput
  | SpeechInput
  | EmotionInput
  | VoiceDesignInput
  | VoiceCloneInput
  | TranscriptionInput;

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker: number | null;
}

export type JobResult =
  | { kind: "lyrics_recognition"; hasVocals: boolean; lyrics: string }
  | { kind: "emotion_enhance"; text: string }
  | { kind: "transcription"; language: string; transcript: string; durationSeconds: number; segments: TranscriptSegment[] }
  | { kind: "voice_design"; voiceIds: UUID[]; features: Record<string, string> | null }
  | { kind: "voice_clone"; voiceId: UUID };
