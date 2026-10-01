import type { UUID } from "./common";

export type VoiceType = "built-in" | "custom" | "designed";
export type VoiceDeletionStatus = "active" | "deleting" | "deleted" | "delete_failed";

export interface Voice {
  id: UUID;
  providerVoiceId: string;
  name: string;
  type: VoiceType;
  labels: string | null;
  language: string | null;
  previewUrl: string | null;
  permissionConfirmedAt: string | null;
  deletionStatus: VoiceDeletionStatus;
  createdAt: string;
}

export interface VoiceListQuery {
  type?: VoiceType;
  q?: string;
}
