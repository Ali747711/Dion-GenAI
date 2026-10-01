import pino from "pino";

import { env } from "../../config/env";

/**
 * Structured logger. Redacts fields that could leak secrets, lyrics, or
 * session identifiers into routine logs.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.NOIZ_API_KEY",
      "*.password",
      "*.lyrics",
      "*.lyricsPrompt",
      "*.prompt",
    ],
    censor: "[redacted]",
  },
});

export type Logger = typeof logger;
