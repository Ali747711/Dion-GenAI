/**
 * Magic-byte audio type detection. Never trusts a client-supplied
 * Content-Type / field extension — the stored MIME is always derived from
 * the actual bytes.
 */
export function sniffAudioMime(buffer: Buffer): string | null {
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
    return "audio/wav";
  }
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "fLaC") {
    return "audio/flac";
  }
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS") {
    return "audio/ogg";
  }
  if (buffer.length >= 3 && buffer.toString("ascii", 0, 3) === "ID3") {
    return "audio/mpeg";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    return "audio/mp4"; // m4a / aac-in-mp4 container
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    // MPEG frame sync. Layer bits (bits 2-1 of byte 1): 01 = Layer III (mp3).
    const layerBits = (buffer[1] & 0x06) >> 1;
    if (layerBits === 1) return "audio/mpeg";
    return "audio/aac"; // ADTS AAC frame sync
  }
  return null;
}

export const MIME_EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};
