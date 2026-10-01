import type { ZodType } from "zod";

import AppError, { ErrorCode, Message } from "../Errors";

export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_";
      if (!(key in fields)) fields[key] = issue.message;
    }
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields });
  }
  return result.data;
}

/**
 * Like `parseOrThrow`, but for a schema validated separately from its parent
 * object (e.g. a job/estimate's kind-specific `input` payload) — field keys
 * are prefixed so callers still see `input.lyrics`, not just `lyrics`.
 */
export function parseNestedOrThrow<T>(schema: ZodType<T>, data: unknown, prefix: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? `${prefix}.${issue.path.join(".")}` : prefix;
      if (!(key in fields)) fields[key] = issue.message;
    }
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields });
  }
  return result.data;
}
