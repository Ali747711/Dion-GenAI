import { createApp } from "./app";
import { env } from "./config/env";
import { closeDb } from "./db/client";
import { logger } from "./libs/utils/logger";
import { storageService } from "./services/storage.service";

async function main(): Promise<void> {
  await storageService.ensureRoot();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, mode: env.NOIZ_MODE }, "API server listening");
  });

  function shutdown(signal: string): void {
    logger.info({ signal }, "API server shutting down");
    server.close(() => {
      closeDb().finally(() => process.exit(0));
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start API server");
  process.exit(1);
});
