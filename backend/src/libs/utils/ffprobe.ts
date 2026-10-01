import { spawn } from "node:child_process";

/** Probes a media file's duration in seconds via ffprobe. Rejects if ffprobe is unavailable or the file is unreadable. */
export function probeAudioDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath]);

    let output = "";
    let errored = false;
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      errored = true;
      reject(error);
    });
    child.on("close", (code) => {
      if (errored) return;
      const parsed = Number.parseFloat(output.trim());
      if (code === 0 && Number.isFinite(parsed) && parsed > 0) {
        resolve(parsed);
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });
  });
}
