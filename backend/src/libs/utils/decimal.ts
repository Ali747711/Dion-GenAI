/**
 * Fixed-point decimal-string arithmetic for USD amounts (numeric(12,6) in
 * Postgres). Never uses floats for money math so repeated add/subtract never
 * drifts from what is stored in the ledger.
 */
const SCALE = 1_000_000n; // 6 decimal places

export function toMicros(value: string | number): bigint {
  if (typeof value === "number") {
    return BigInt(Math.round(value * 1_000_000));
  }
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = "0", frac = ""] = unsigned.split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  const magnitude = BigInt(whole || "0") * SCALE + BigInt(fracPadded || "0");
  return negative ? -magnitude : magnitude;
}

export function fromMicros(micros: bigint): string {
  const negative = micros < 0n;
  const abs = negative ? -micros : micros;
  const whole = abs / SCALE;
  const frac = abs % SCALE;
  return `${negative ? "-" : ""}${whole.toString()}.${frac.toString().padStart(6, "0")}`;
}

export function addUsd(a: string | number, b: string | number): string {
  return fromMicros(toMicros(a) + toMicros(b));
}

export function subtractUsd(a: string | number, b: string | number): string {
  return fromMicros(toMicros(a) - toMicros(b));
}

export function compareUsd(a: string | number, b: string | number): number {
  const diff = toMicros(a) - toMicros(b);
  return diff > 0n ? 1 : diff < 0n ? -1 : 0;
}

export function usdFromNumber(value: number): string {
  return fromMicros(BigInt(Math.round(value * 1_000_000)));
}

export function negateUsd(value: string | number): string {
  return fromMicros(-toMicros(value));
}

export const ZERO_USD = "0.000000";
