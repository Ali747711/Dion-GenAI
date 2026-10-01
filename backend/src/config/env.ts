import "dotenv/config";
import { z } from "zod";

import { coerceBoolean } from "../libs/utils/zodCoerce";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4100),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().min(1).optional(),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  OWNER_PASSWORD_HASH: z.string().min(1, "OWNER_PASSWORD_HASH is required"),
  OWNER_NAME: z.string().min(1).default("Owner"),

  COOKIE_SECURE: coerceBoolean(false),
  // Number of reverse proxies in front of the API (e.g. Vercel rewrite + Render = 2).
  // Needed so secure cookies are issued and rate limits key on the client IP.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),

  NOIZ_MODE: z.enum(["mock", "live"]).default("mock"),
  NOIZ_BASE_URL: z.string().url().default("https://noiz.ai/v1"),
  NOIZ_API_KEY: z.string().optional(),

  STORAGE_DIR: z.string().min(1).default("./storage"),
  MOCK_AUDIO_SOURCE_PATH: z.string().min(1).default("../music/audio.mp3"),

  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  WORKER_LEASE_MS: z.coerce.number().int().positive().default(30000),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(6),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Normally unset: the client is served same-origin (Vite proxy / Vercel rewrite).
  // When set, it must be one exact origin — credentials are allowed for it.
  CORS_ORIGIN: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      return (url.protocol === "https:" || local) && url.origin === value.replace(/\/$/, "");
    }, "CORS_ORIGIN must be one exact https origin (or http://localhost) with no path or wildcard")
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  if (parsed.data.NOIZ_MODE === "live" && !parsed.data.NOIZ_API_KEY) {
    console.error("Invalid environment configuration:\n  - NOIZ_API_KEY is required when NOIZ_MODE=live");
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isTestEnv = env.NODE_ENV === "test";

export function resolveDatabaseUrl(): string {
  if (isTestEnv) {
    return env.TEST_DATABASE_URL ?? env.DATABASE_URL;
  }
  return env.DATABASE_URL;
}
