import path from "node:path";

import type {
  CoverInput,
  EmotionInput,
  LyricsRecognitionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  VoiceCloneInput,
  VoiceDesignInput,
} from "../../src/libs/types/audioStudio";
import type { MusicInputParsed } from "../../src/validators/music.validator";

export const FIXTURE_AUDIO_PATH = path.join(__dirname, "..", "fixtures", "sample-audio.bin");

export function validMusicInput(overrides: Partial<MusicInputParsed> = {}): MusicInputParsed {
  return {
    prompt: "A dreamy lo-fi track about rainy afternoons",
    lyricsMode: "generate",
    lyricsPrompt: "rain on the window, coffee going cold",
    title: "Rainy Afternoon",
    tags: ["lofi"],
    ...overrides,
  };
}

export function validCoverInput(uploadId: string, overrides: Partial<CoverInput> = {}): CoverInput {
  return {
    uploadId,
    lyrics: "La la la, singing over the melody",
    melodyAdherence: "main_melody",
    musicDescription: "Warm acoustic cover with soft vocals",
    rightsConfirmed: true,
    ...overrides,
  };
}

export function validLyricsRecognitionInput(uploadId: string): LyricsRecognitionInput {
  return { uploadId };
}

export function validSoundInput(overrides: Partial<SoundInput> = {}): SoundInput {
  return { prompt: "A gentle rain shower with distant thunder", durationSeconds: 5, format: "wav", ...overrides };
}

export function validSpeechInput(voiceId: string, overrides: Partial<SpeechInput> = {}): SpeechInput {
  return { text: "Hello from the audio studio test suite.", voiceId, format: "wav", ...overrides };
}

export function validEmotionInput(overrides: Partial<EmotionInput> = {}): EmotionInput {
  return { text: "I am so excited to see you today!", ...overrides };
}

export function validVoiceDesignInput(overrides: Partial<VoiceDesignInput> = {}): VoiceDesignInput {
  return { voiceDescription: "A warm, friendly, and confident female voice with a slight rasp", ...overrides };
}

export function validVoiceCloneInput(uploadId: string, overrides: Partial<VoiceCloneInput> = {}): VoiceCloneInput {
  return { uploadId, name: "My Cloned Voice", permissionConfirmed: true, ...overrides };
}

export function validTranscriptionInput(uploadId: string, overrides: Partial<TranscriptionInput> = {}): TranscriptionInput {
  return { uploadId, ...overrides };
}
