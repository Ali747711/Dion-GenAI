/**
 * Pure-JS 16-bit mono PCM WAV writer. Used by the mock provider to produce
 * a real, playable audio file of an exact requested duration without any
 * external encoder dependency.
 */
const SAMPLE_RATE = 8000;

export interface WavOptions {
  /** Base tone frequency in Hz (a gentle, deterministic sine so mock output is reproducible). */
  frequencyHz?: number;
  amplitude?: number; // 0..1
}

export function writeSineWav(durationSeconds: number, options: WavOptions = {}): Buffer {
  const frequencyHz = options.frequencyHz ?? 440;
  const amplitude = options.amplitude ?? 0.2;
  const numSamples = Math.max(1, Math.round(durationSeconds * SAMPLE_RATE));
  const dataSize = numSamples * 2; // 16-bit mono

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format = PCM
  buffer.writeUInt16LE(1, 22); // channels = mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / SAMPLE_RATE;
    const sample = Math.round(Math.sin(2 * Math.PI * frequencyHz * t) * amplitude * 32767);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

/** Exact duration in seconds a buffer produced by `writeSineWav` encodes (round-trips exactly). */
export function wavDurationSeconds(dataByteLength: number): number {
  return dataByteLength / 2 / SAMPLE_RATE;
}
