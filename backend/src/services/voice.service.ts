import { VOICE_SYNC_INTERVAL_MS } from "../libs/configs";
import { VoiceDeletionStatus, VoiceType } from "../libs/enums/job.enum";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import { toApiVoice } from "../libs/mappers/voice.mapper";
import type { Voice, VoiceListQuery } from "../libs/types/voice";
import { voiceRepository } from "../repositories/voice.repository";
import { getAudioStudioProvider } from "./provider/provider.factory";

async function ensureBuiltInVoicesSynced(): Promise<void> {
  const [count, newestSyncAt] = await Promise.all([voiceRepository.countBuiltIn(), voiceRepository.newestBuiltInSyncAt()]);
  const stale = !newestSyncAt || Date.now() - newestSyncAt.getTime() > VOICE_SYNC_INTERVAL_MS;
  if (count > 0 && !stale) return;

  const provider = getAudioStudioProvider();
  const remote = await provider.listBuiltInVoices();
  for (const voice of remote) {
    await voiceRepository.upsertBuiltIn({
      providerVoiceId: voice.providerVoiceId,
      name: voice.name,
      type: VoiceType.BUILT_IN,
      labels: voice.labels,
      language: voice.language,
      deletionStatus: VoiceDeletionStatus.ACTIVE,
    });
  }
}

export const voiceService = {
  async listVoices(query: VoiceListQuery): Promise<Voice[]> {
    await ensureBuiltInVoicesSynced();
    const rows = await voiceRepository.findMany({ type: query.type, q: query.q });
    return rows.map(toApiVoice);
  },

  async getVoice(id: string): Promise<Voice> {
    const row = await voiceRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return toApiVoice(row);
  },

  async getPreviewFile(id: string): Promise<{ storageKey: string; mimeType: string }> {
    const row = await voiceRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (!row.previewStorageKey || !row.previewMimeType) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return { storageKey: row.previewStorageKey, mimeType: row.previewMimeType };
  },

  async renameVoice(id: string, name: string): Promise<Voice> {
    const row = await voiceRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (row.type === VoiceType.BUILT_IN) {
      throw new AppError(ErrorCode.CONFLICT, "Built-in voices cannot be renamed");
    }
    const updated = await voiceRepository.update(id, { name });
    if (!updated) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return toApiVoice(updated);
  },

  async deleteVoice(id: string): Promise<Voice> {
    const row = await voiceRepository.findById(id);
    if (!row) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (row.type === VoiceType.BUILT_IN) {
      throw new AppError(ErrorCode.CONFLICT, "Built-in voices cannot be deleted");
    }

    await voiceRepository.update(id, { deletionStatus: VoiceDeletionStatus.DELETING });
    try {
      const provider = getAudioStudioProvider();
      await provider.deleteVoice(row.providerVoiceId);
      const updated = await voiceRepository.update(id, { deletionStatus: VoiceDeletionStatus.DELETED });
      if (!updated) throw new AppError(ErrorCode.NOT_FOUND, Message.NO_DATA_FOUND);
      return toApiVoice(updated);
    } catch (error) {
      await voiceRepository.update(id, { deletionStatus: VoiceDeletionStatus.DELETE_FAILED });
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE, { cause: error });
    }
  },
};
