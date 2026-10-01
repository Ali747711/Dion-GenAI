import type { UploadRow } from "../../db/schema";
import type { Upload, UploadPurpose } from "../types/upload";

export function toApiUpload(row: UploadRow): Upload {
  return {
    id: row.id,
    purpose: row.purpose as UploadPurpose,
    filename: row.filename,
    mimeType: row.mimeType,
    bytes: row.bytes,
    durationSeconds: row.durationSeconds,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
