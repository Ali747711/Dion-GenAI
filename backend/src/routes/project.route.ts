import { Router } from "express";

import { projectController } from "../controllers/project.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const projectRouter = Router();

projectRouter.get("/", requireAuth, projectController.list);
projectRouter.post("/", requireAuth, requireCsrf, projectController.create);
projectRouter.get("/:id", requireAuth, projectController.getById);
projectRouter.patch("/:id", requireAuth, requireCsrf, projectController.update);

export default projectRouter;
