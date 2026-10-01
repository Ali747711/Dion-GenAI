import { UPLOAD_LIMITS } from "../libs/configs";
import type { Capability } from "../libs/types/capability";
import { budgetRepository } from "../repositories/budget.repository";
import { isUsdCapUnset } from "./usdBudgetMath.service";

const NOT_YET_IMPLEMENTED = "Not implemented in this release";
const USD_CAP_UNSET_REASON = "Set a USD pay-as-you-go cap in Settings";

export const capabilityService = {
  async listCapabilities(): Promise<Capability[]> {
    const config = await budgetRepository.get();
    const usdBlocked = !config || isUsdCapUnset(config.usdMonthlyCap);

    return [
      { key: "music", label: "Original songs", release: "R1", available: true, reason: null },
      { key: "cover", label: "Covers", release: "R2", available: true, reason: null, limits: { uploadTypes: UPLOAD_LIMITS.cover_source?.types, maxUploadBytes: UPLOAD_LIMITS.cover_source?.maxBytes, lyricsMaxChars: 5000 } },
      {
        key: "sound",
        label: "Sound effects",
        release: "R2",
        available: !usdBlocked,
        reason: usdBlocked ? USD_CAP_UNSET_REASON : null,
        limits: { minDurationSeconds: 1, maxDurationSeconds: 30, promptMaxChars: 500 },
      },
      {
        key: "speech",
        label: "Speech (TTS)",
        release: "R2",
        available: !usdBlocked,
        reason: usdBlocked ? USD_CAP_UNSET_REASON : null,
        limits: { maxChars: 50000, streamThresholdChars: 5000, speedRange: [0.5, 2] },
      },
      {
        key: "voices",
        label: "Voice library",
        release: "R2",
        available: !usdBlocked,
        reason: usdBlocked ? USD_CAP_UNSET_REASON : null,
        limits: { uploadTypes: UPLOAD_LIMITS.voice_sample?.types, maxUploadBytes: UPLOAD_LIMITS.voice_sample?.maxBytes, maxDurationSeconds: UPLOAD_LIMITS.voice_sample?.maxDurationSeconds },
      },
      {
        key: "transcribe",
        label: "Transcription",
        release: "R2",
        available: !usdBlocked,
        reason: usdBlocked ? USD_CAP_UNSET_REASON : null,
        limits: { uploadTypes: UPLOAD_LIMITS.transcription?.types, maxUploadBytes: UPLOAD_LIMITS.transcription?.maxBytes, maxDurationSeconds: UPLOAD_LIMITS.transcription?.maxDurationSeconds },
      },
      { key: "media", label: "Artwork & video", release: "R3", available: false, reason: NOT_YET_IMPLEMENTED },
      { key: "workflows", label: "Composed workflows", release: "R4", available: false, reason: NOT_YET_IMPLEMENTED },
    ];
  },
};
