import { createHash } from "node:crypto";

/**
 * Deterministic fingerprint of a job creation request (kind + input +
 * projectId). Used to detect a changed payload reusing the same
 * idempotency key.
 */
export function hashJobRequest(payload: unknown): string {
  const normalized = JSON.stringify(sortKeysDeep(payload));
  return createHash("sha256").update(normalized).digest("hex");
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([key, val]) => [key, sortKeysDeep(val)]));
  }
  return value;
}
