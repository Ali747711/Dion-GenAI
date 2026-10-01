import { randomUUID } from "node:crypto";

import { writeSineWav } from "../../src/libs/utils/wavWriter";
import { uploadRepository } from "../../src/repositories/upload.repository";
import { storageService } from "../../src/services/storage.service";

/** Directly inserts a ready-to-use Upload row (bypassing HTTP/multipart) for job-creation tests. */
export async function insertTestUpload(
  purpose: "cover_source" | "voice_sample" | "transcription",
  overrides: { durationSeconds?: number | null; mimeType?: string; bytes?: number; expiresAt?: Date } = {}
) {
  const buffer = writeSineWav(overrides.durationSeconds ?? 5);
  const { storageKey, bytes } = await storageService.storeBuffer(buffer, overrides.mimeType ?? "audio/wav");
  return uploadRepository.insert({
    id: randomUUID(),
    purpose,
    filename: "test-upload.wav",
    mimeType: overrides.mimeType ?? "audio/wav",
    storageKey,
    bytes: overrides.bytes ?? bytes,
    durationSeconds: overrides.durationSeconds ?? 5,
    status: "ready",
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

export function sineWavBuffer(durationSeconds: number): Buffer {
  return writeSineWav(durationSeconds);
}
