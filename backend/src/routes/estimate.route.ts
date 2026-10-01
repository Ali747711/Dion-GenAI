import { Router } from "express";

import { estimateController } from "../controllers/estimate.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const estimateRouter = Router();

estimateRouter.post("/", requireAuth, requireCsrf, estimateController.create);

export default estimateRouter;
