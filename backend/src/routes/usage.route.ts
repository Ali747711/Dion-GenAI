import { Router } from "express";

import { usageController } from "../controllers/usage.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const usageRouter = Router();

usageRouter.get("/", requireAuth, usageController.getUsage);
usageRouter.get("/ledger", requireAuth, usageController.getLedger);
usageRouter.post("/reconciliations", requireAuth, requireCsrf, usageController.createReconciliation);

export default usageRouter;
