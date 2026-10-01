import { randomBytes } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";

import { env } from "../config/env";

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
};

export function extensionForMime(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "bin";
}

function storageRoot(): string {
  return path.resolve(process.cwd(), env.STORAGE_DIR);
}

/**
 * Local filesystem storage adapter (backend/storage/). Object keys are
 * random, so nothing about a stored file's origin is guessable, and callers
 * never pass user-controlled paths through to the filesystem.
 */
export const storageService = {
  async ensureRoot(): Promise<void> {
    await fs.mkdir(storageRoot(), { recursive: true });
  },

  generateKey(mimeType: string): string {
    return `${randomBytes(16).toString("hex")}.${extensionForMime(mimeType)}`;
  },

  absolutePath(storageKey: string): string {
    return path.join(storageRoot(), storageKey);
  },

  /** A scratch path (inside the storage root, so renames stay on one filesystem) for a file still being validated. */
  tempPath(): string {
    return path.join(storageRoot(), `tmp-${randomBytes(16).toString("hex")}.upload`);
  },

  /** Copies a "downloaded" result into storage under a fresh random key (simulates a real provider download). */
  async copyFrom(sourcePath: string, mimeType: string): Promise<{ storageKey: string; bytes: number }> {
    await this.ensureRoot();
    const storageKey = this.generateKey(mimeType);
    await fs.copyFile(sourcePath, this.absolutePath(storageKey));
    const stat = await fs.stat(this.absolutePath(storageKey));
    return { storageKey, bytes: stat.size };
  },

  /** Persists an in-memory buffer (e.g. a provider's binary response, or mock-generated audio) under a fresh random key. */
  async storeBuffer(buffer: Buffer, mimeType: string): Promise<{ storageKey: string; bytes: number }> {
    await this.ensureRoot();
    const storageKey = this.generateKey(mimeType);
    await fs.writeFile(this.absolutePath(storageKey), buffer);
    return { storageKey, bytes: buffer.byteLength };
  },

  /** Moves a temp upload file (already on the same filesystem) into storage under a fresh random key. */
  async adoptTempFile(tempPath: string, mimeType: string): Promise<{ storageKey: string; bytes: number }> {
    await this.ensureRoot();
    const storageKey = this.generateKey(mimeType);
    await fs.rename(tempPath, this.absolutePath(storageKey));
    const stat = await fs.stat(this.absolutePath(storageKey));
    return { storageKey, bytes: stat.size };
  },

  async remove(storageKey: string): Promise<void> {
    await fs.rm(this.absolutePath(storageKey), { force: true });
  },

  async stat(storageKey: string): Promise<{ size: number }> {
    return fs.stat(this.absolutePath(storageKey));
  },

  createReadStream(storageKey: string, range?: { start: number; end: number }): ReturnType<typeof createReadStream> {
    return createReadStream(this.absolutePath(storageKey), range);
  },
};
