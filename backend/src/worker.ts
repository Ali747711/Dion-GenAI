import { env } from "./config/env";
import { closeDb } from "./db/client";
import { logger } from "./libs/utils/logger";
import { storageService } from "./services/storage.service";
import { startWorkerLoop } from "./worker/runner";

async function main(): Promise<void> {
  await storageService.ensureRoot();
  logger.info({ mode: env.NOIZ_MODE, pollIntervalMs: env.WORKER_POLL_INTERVAL_MS }, "Worker starting");

  const handle = startWorkerLoop();

  function shutdown(signal: string): void {
    logger.info({ signal }, "Worker shutting down");
    handle.stop();
    closeDb().finally(() => process.exit(0));
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start worker");
  process.exit(1);
});
