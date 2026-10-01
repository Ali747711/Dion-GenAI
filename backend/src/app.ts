import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { JSON_BODY_LIMIT } from "./libs/configs";
import { logger } from "./libs/utils/logger";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middlewares/errorHandler.middleware";
import { requestIdMiddleware } from "./middlewares/requestId.middleware";
import { sessionMiddleware } from "./middlewares/session.middleware";

import assetRouter from "./routes/asset.route";
import budgetRouter from "./routes/budget.route";
import capabilityRouter from "./routes/capability.route";
import connectionRouter from "./routes/connection.route";
import estimateRouter from "./routes/estimate.route";
import healthRouter from "./routes/health.route";
import jobRouter from "./routes/job.route";
import projectRouter from "./routes/project.route";
import sessionRouter from "./routes/session.route";
import soundHistoryRouter from "./routes/soundHistory.route";
import uploadRouter from "./routes/upload.route";
import usageRouter from "./routes/usage.route";
import voiceRouter from "./routes/voice.route";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => (res as unknown as { locals: { requestId: string } }).locals.requestId,
      autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false },
    })
  );
  app.use(helmet());

  // Bounded CORS, only engaged when a cross-origin client is configured; the
  // default dev setup proxies through Vite and never needs this.
  if (env.CORS_ORIGIN) {
    const allowedOrigin = env.CORS_ORIGIN;
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(sessionMiddleware);

  app.use("/health", healthRouter);
  app.use("/api/v1/session", sessionRouter);
  app.use("/api/v1/capabilities", capabilityRouter);
  app.use("/api/v1/connection", connectionRouter);
  app.use("/api/v1/estimates", estimateRouter);
  app.use("/api/v1/jobs", jobRouter);
  app.use("/api/v1/assets", assetRouter);
  app.use("/api/v1/projects", projectRouter);
  app.use("/api/v1/usage", usageRouter);
  app.use("/api/v1/budget", budgetRouter);
  app.use("/api/v1/uploads", uploadRouter);
  app.use("/api/v1/voices", voiceRouter);
  app.use("/api/v1/sound", soundHistoryRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
