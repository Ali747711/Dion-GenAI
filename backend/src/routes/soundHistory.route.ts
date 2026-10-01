import { Router } from "express";

import { soundHistoryController } from "../controllers/soundHistory.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const soundHistoryRouter = Router();

soundHistoryRouter.get("/provider-history", requireAuth, soundHistoryController.list);
soundHistoryRouter.delete("/provider-history/:genProductId", requireAuth, requireCsrf, soundHistoryController.remove);

export default soundHistoryRouter;
