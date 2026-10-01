import type { UUID } from "./common";

export type UploadPurpose = "cover_source" | "voice_sample" | "transcription";

export interface Upload {
  id: UUID;
  purpose: UploadPurpose;
  filename: string;
  mimeType: string;
  bytes: number;
  durationSeconds: number | null;
  expiresAt: string;
  createdAt: string;
}
