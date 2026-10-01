import { getAudioStudioProvider } from "./provider/provider.factory";

export interface SoundHistoryEntry {
  genProductId: string;
  prompt: string;
  durationSeconds: number;
  createdAt: string;
}

export const soundHistoryService = {
  async list(skip: number, limit: number): Promise<SoundHistoryEntry[]> {
    const provider = getAudioStudioProvider();
    const items = await provider.listSoundHistory(skip, limit);
    return items.map((item) => ({
      genProductId: item.genProductId,
      prompt: item.prompt,
      durationSeconds: item.durationSeconds,
      createdAt: item.createdAt,
    }));
  },

  async remove(genProductId: string): Promise<{ genProductId: string }> {
    const provider = getAudioStudioProvider();
    await provider.deleteSoundHistoryItem(genProductId);
    return { genProductId };
  },
};
