import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  coverInputSchema,
  emotionInputSchema,
  lyricsRecognitionInputSchema,
  soundInputSchema,
  speechInputSchema,
  transcriptionInputSchema,
  voiceCloneInputSchema,
  voiceDesignInputSchema,
} from "../src/validators/audioStudio.validator";
import {
  validCoverInput,
  validEmotionInput,
  validLyricsRecognitionInput,
  validSoundInput,
  validSpeechInput,
  validTranscriptionInput,
  validVoiceCloneInput,
  validVoiceDesignInput,
} from "./helpers/fixtures";

describe("R2 job input validators", () => {
  it("cover: accepts a valid input", () => {
    expect(coverInputSchema.safeParse(validCoverInput(randomUUID())).success).toBe(true);
  });

  it("cover: rejects when neither musicDescription nor style is present", () => {
    const result = coverInputSchema.safeParse(validCoverInput(randomUUID(), { musicDescription: undefined, style: undefined }));
    expect(result.success).toBe(false);
  });

  it("cover: requires rightsConfirmed to be exactly true", () => {
    const result = coverInputSchema.safeParse({ ...validCoverInput(randomUUID()), rightsConfirmed: false });
    expect(result.success).toBe(false);
  });

  it("lyrics_recognition: requires an uploadId", () => {
    expect(lyricsRecognitionInputSchema.safeParse(validLyricsRecognitionInput(randomUUID())).success).toBe(true);
    expect(lyricsRecognitionInputSchema.safeParse({}).success).toBe(false);
  });

  it("sound: enforces the 1-30s duration bound", () => {
    expect(soundInputSchema.safeParse(validSoundInput({ durationSeconds: 1 })).success).toBe(true);
    expect(soundInputSchema.safeParse(validSoundInput({ durationSeconds: 30 })).success).toBe(true);
    expect(soundInputSchema.safeParse(validSoundInput({ durationSeconds: 0 })).success).toBe(false);
    expect(soundInputSchema.safeParse(validSoundInput({ durationSeconds: 31 })).success).toBe(false);
  });

  it("sound: enforces the 500-char prompt limit", () => {
    const result = soundInputSchema.safeParse(validSoundInput({ prompt: "x".repeat(501) }));
    expect(result.success).toBe(false);
  });

  it("speech: allows mp3 when text is short", () => {
    const result = speechInputSchema.safeParse(validSpeechInput(randomUUID(), { format: "mp3", text: "short text" }));
    expect(result.success).toBe(true);
  });

  it("speech: rejects mp3 when text exceeds 5000 chars (long-form must stream as wav)", () => {
    const result = speechInputSchema.safeParse(validSpeechInput(randomUUID(), { format: "mp3", text: "x".repeat(5001) }));
    expect(result.success).toBe(false);
  });

  it("speech: allows wav for long-form text", () => {
    const result = speechInputSchema.safeParse(validSpeechInput(randomUUID(), { format: "wav", text: "x".repeat(5001) }));
    expect(result.success).toBe(true);
  });

  it("speech: enforces the speed range", () => {
    expect(speechInputSchema.safeParse(validSpeechInput(randomUUID(), { speed: 0.5 })).success).toBe(true);
    expect(speechInputSchema.safeParse(validSpeechInput(randomUUID(), { speed: 2 })).success).toBe(true);
    expect(speechInputSchema.safeParse(validSpeechInput(randomUUID(), { speed: 0.1 })).success).toBe(false);
    expect(speechInputSchema.safeParse(validSpeechInput(randomUUID(), { speed: 3 })).success).toBe(false);
  });

  it("emotion_enhance: enforces the 5000-char limit", () => {
    expect(emotionInputSchema.safeParse(validEmotionInput()).success).toBe(true);
    expect(emotionInputSchema.safeParse(validEmotionInput({ text: "x".repeat(5001) })).success).toBe(false);
  });

  it("voice_design: enforces the 20-1000 char description bound", () => {
    expect(voiceDesignInputSchema.safeParse(validVoiceDesignInput()).success).toBe(true);
    expect(voiceDesignInputSchema.safeParse(validVoiceDesignInput({ voiceDescription: "too short" })).success).toBe(false);
    expect(voiceDesignInputSchema.safeParse(validVoiceDesignInput({ voiceDescription: "x".repeat(1001) })).success).toBe(false);
  });

  it("voice_design: enforces guidanceScale and loudness ranges", () => {
    expect(voiceDesignInputSchema.safeParse(validVoiceDesignInput({ guidanceScale: 101 })).success).toBe(false);
    expect(voiceDesignInputSchema.safeParse(validVoiceDesignInput({ loudness: 2 })).success).toBe(false);
  });

  it("voice_clone: requires permissionConfirmed to be exactly true", () => {
    expect(voiceCloneInputSchema.safeParse(validVoiceCloneInput(randomUUID())).success).toBe(true);
    const result = voiceCloneInputSchema.safeParse({ ...validVoiceCloneInput(randomUUID()), permissionConfirmed: false });
    expect(result.success).toBe(false);
  });

  it("transcription: requires an uploadId", () => {
    expect(transcriptionInputSchema.safeParse(validTranscriptionInput(randomUUID())).success).toBe(true);
    expect(transcriptionInputSchema.safeParse({ language: "en" }).success).toBe(false);
  });
});
