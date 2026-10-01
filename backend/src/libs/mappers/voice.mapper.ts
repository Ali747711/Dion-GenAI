import type { VoiceRow } from "../../db/schema";
import type { Voice, VoiceDeletionStatus, VoiceType } from "../types/voice";

export function toApiVoice(row: VoiceRow): Voice {
  return {
    id: row.id,
    providerVoiceId: row.providerVoiceId,
    name: row.name,
    type: row.type as VoiceType,
    labels: row.labels,
    language: row.language,
    previewUrl: row.previewStorageKey ? `/api/v1/voices/${row.id}/preview` : null,
    permissionConfirmedAt: row.permissionConfirmedAt ? row.permissionConfirmedAt.toISOString() : null,
    deletionStatus: row.deletionStatus as VoiceDeletionStatus,
    createdAt: row.createdAt.toISOString(),
  };
}
