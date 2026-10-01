import { Router } from "express";

import { budgetController } from "../controllers/budget.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const budgetRouter = Router();

budgetRouter.get("/", requireAuth, budgetController.get);
budgetRouter.patch("/", requireAuth, requireCsrf, budgetController.update);

export default budgetRouter;
