import path from "node:path";

import { env } from "../../config/env";
import { logger } from "../../libs/utils/logger";
import { probeAudioDurationSeconds } from "../../libs/utils/ffprobe";

const FALLBACK_DURATION_SECONDS = 139;

export function mockAudioSourcePath(): string {
  return path.resolve(process.cwd(), env.MOCK_AUDIO_SOURCE_PATH);
}

let cachedDuration: number | null = null;

/** Measures the sample file's real duration via ffprobe; falls back to a fixed constant if unavailable. */
export async function getMockAudioDurationSeconds(): Promise<number> {
  if (cachedDuration !== null) return cachedDuration;

  try {
    const seconds = await probeAudioDurationSeconds(mockAudioSourcePath());
    cachedDuration = seconds;
    return seconds;
  } catch (error) {
    logger.warn({ err: error }, "ffprobe unavailable; using fallback mock audio duration");
    cachedDuration = FALLBACK_DURATION_SECONDS;
    return FALLBACK_DURATION_SECONDS;
  }
}
