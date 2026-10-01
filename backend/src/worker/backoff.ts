/** Exponential backoff with jitter, capped at 60s. */
export function computeBackoffMs(attempts: number): number {
  const base = 1000 * 2 ** Math.max(0, attempts - 1);
  const capped = Math.min(base, 60_000);
  const jitter = Math.random() * capped * 0.3;
  return Math.round(capped + jitter);
}
