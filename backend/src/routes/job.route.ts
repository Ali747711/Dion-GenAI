import { Router } from "express";

import { jobController } from "../controllers/job.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";
import { jobCreationRateLimiter } from "../middlewares/rateLimit.middleware";

const jobRouter = Router();

jobRouter.post("/", requireAuth, jobCreationRateLimiter, requireCsrf, jobController.create);
jobRouter.get("/", requireAuth, jobController.list);
jobRouter.get("/:id", requireAuth, jobController.getById);
jobRouter.get("/:id/transcript", requireAuth, jobController.transcript);
jobRouter.post("/:id/cancel", requireAuth, requireCsrf, jobController.cancel);

export default jobRouter;
