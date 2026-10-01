import { Router } from "express";

import { connectionController } from "../controllers/connection.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const connectionRouter = Router();

connectionRouter.get("/", requireAuth, connectionController.getStatus);

export default connectionRouter;
