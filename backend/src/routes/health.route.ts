import { Router } from "express";

import { healthController } from "../controllers/health.controller";

const healthRouter = Router();

healthRouter.get("/live", healthController.live);
healthRouter.get("/ready", healthController.ready);

export default healthRouter;
