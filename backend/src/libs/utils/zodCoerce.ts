import { z } from "zod";

/**
 * `z.coerce.boolean()` just runs `Boolean(value)`, so the string "false"
 * (as arrives from env vars and query params) coerces to `true`. This parses
 * "true"/"1"/"yes"/"on" (case-insensitive) as true and everything else as
 * false, which is what callers actually mean by a boolean env var or flag.
 */
export function coerceBoolean(defaultValue?: boolean) {
  const transformed = z.preprocess((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
    return value;
  }, z.boolean());

  if (defaultValue === undefined) return transformed.optional();
  return transformed.default(defaultValue);
}
