import { Router } from "express";

import { capabilityController } from "../controllers/capability.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const capabilityRouter = Router();

capabilityRouter.get("/", requireAuth, capabilityController.list);

export default capabilityRouter;
