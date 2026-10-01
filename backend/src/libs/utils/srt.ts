function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** Formats a seconds offset as an SRT timestamp: HH:MM:SS,mmm. */
export function secondsToSrtTimestamp(totalSeconds: number): string {
  const totalMs = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}
