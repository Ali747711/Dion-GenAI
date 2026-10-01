import { createWriteStream, promises as fsPromises } from "node:fs";
import type { Request } from "express";

import busboy from "busboy";

import { UPLOAD_EXPIRY_MS, UPLOAD_LIMITS } from "../libs/configs";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import { toApiUpload } from "../libs/mappers/upload.mapper";
import type { Upload } from "../libs/types/upload";
import { probeAudioDurationSeconds } from "../libs/utils/ffprobe";
import { sniffAudioMime } from "../libs/utils/audioSniff";
import { logger } from "../libs/utils/logger";
import { uploadRepository } from "../repositories/upload.repository";
import { storageService } from "./storage.service";

const MAX_ANY_PURPOSE_BYTES = Math.max(...Object.values(UPLOAD_LIMITS).map((limit) => limit.maxBytes));
const SNIFF_BYTES = 64;

interface StreamResult {
  tempPath: string;
  purpose: string | undefined;
  filename: string;
  bytes: number;
}

export const uploadService = {
  async receiveUpload(req: Request): Promise<Upload> {
    const { tempPath, purpose, filename, bytes } = await streamToTemp(req);

    try {
      const limit = purpose ? UPLOAD_LIMITS[purpose] : undefined;
      if (!purpose || !limit) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, {
          fields: { purpose: "purpose is required and must be one of cover_source, voice_sample, transcription" },
        });
      }
      if (bytes === 0) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { file: "file is required" } });
      }
      if (bytes > limit.maxBytes) {
        throw new AppError(ErrorCode.PAYLOAD_TOO_LARGE, Message.PAYLOAD_TOO_LARGE, {
          fields: { file: `Exceeds max size of ${limit.maxBytes} bytes for purpose ${purpose}` },
        });
      }

      const head = await readHead(tempPath, SNIFF_BYTES);
      const mimeType = sniffAudioMime(head);
      if (!mimeType || !limit.types.includes(mimeType)) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, {
          fields: { file: "Unsupported or unrecognized audio file type" },
        });
      }

      let durationSeconds: number | null = null;
      try {
        durationSeconds = await probeAudioDurationSeconds(tempPath);
      } catch (error) {
        logger.warn({ err: error }, "ffprobe could not read uploaded file duration");
        durationSeconds = null;
      }
      if (limit.maxDurationSeconds !== null) {
        if (durationSeconds === null) {
          throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { file: "Unable to determine audio duration" } });
        }
        if (durationSeconds > limit.maxDurationSeconds) {
          throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, {
            fields: { file: `Exceeds max duration of ${limit.maxDurationSeconds}s for purpose ${purpose}` },
          });
        }
      }

      const { storageKey, bytes: storedBytes } = await storageService.adoptTempFile(tempPath, mimeType);

      const row = await uploadRepository.insert({
        purpose,
        filename: sanitizeFilename(filename),
        mimeType,
        storageKey,
        bytes: storedBytes,
        durationSeconds,
        status: "ready",
        expiresAt: new Date(Date.now() + UPLOAD_EXPIRY_MS),
      });

      return toApiUpload(row);
    } catch (error) {
      await fsPromises.rm(tempPath, { force: true });
      throw error;
    }
  },

  async getUpload(id: string): Promise<Upload> {
    const row = await uploadRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return toApiUpload(row);
  },

  /** Marks an upload as consumed (exempting it from the 24h unconsumed-upload cleanup) — idempotent. */
  async markConsumed(id: string): Promise<void> {
    await uploadRepository.markConsumed(id);
  },

  /** Deletes uploads that were never consumed by a job and are past their 24h expiry. Run periodically by the worker. */
  async cleanupExpired(): Promise<number> {
    const expired = await uploadRepository.findExpiredUnconsumed(new Date());
    for (const row of expired) {
      await storageService.remove(row.storageKey);
      await uploadRepository.delete(row.id);
    }
    return expired.length;
  },
};

function streamToTemp(req: Request): Promise<StreamResult> {
  return new Promise((resolve, reject) => {
    let purpose: string | undefined;
    let filename = "upload";
    let bytes = 0;
    let fileSeen = false;
    let settled = false;
    let writeFinished = false;
    let closeFired = false;

    const tempPath = storageService.tempPath();
    const writeStream = createWriteStream(tempPath);

    const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_ANY_PURPOSE_BYTES, files: 1, fields: 10 } });

    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      writeStream.destroy();
      bb.removeAllListeners();
      req.unpipe(bb);
      req.resume();
      void fsPromises.rm(tempPath, { force: true }).finally(() => reject(error));
    };

    const maybeResolve = (): void => {
      if (settled || !closeFired || !writeFinished) return;
      if (!fileSeen) {
        settled = true;
        void fsPromises.rm(tempPath, { force: true }).finally(() => {
          reject(new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { file: "file is required" } }));
        });
        return;
      }
      settled = true;
      resolve({ tempPath, purpose, filename, bytes });
    };

    bb.on("field", (name, value) => {
      if (name === "purpose") purpose = value;
    });

    bb.on("file", (name, stream, info) => {
      if (name !== "file") {
        stream.resume();
        return;
      }
      fileSeen = true;
      filename = info.filename || "upload";
      stream.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
      });
      stream.on("limit", () => fail(new AppError(ErrorCode.PAYLOAD_TOO_LARGE, Message.PAYLOAD_TOO_LARGE)));
      stream.pipe(writeStream);
    });

    bb.on("error", fail);
    writeStream.on("error", fail);
    writeStream.on("finish", () => {
      writeFinished = true;
      maybeResolve();
    });

    bb.on("close", () => {
      closeFired = true;
      if (!fileSeen) {
        writeStream.end();
        writeFinished = true;
      }
      maybeResolve();
    });

    req.pipe(bb);
  });
}

async function readHead(filePath: string, length: number): Promise<Buffer> {
  const handle = await fsPromises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base.replace(/[^a-zA-Z0-9-_. ]/g, "").trim().slice(0, 150);
  return cleaned.length > 0 ? cleaned : "upload";
}
