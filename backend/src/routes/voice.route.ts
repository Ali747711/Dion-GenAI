import { Router } from "express";

import { voiceController } from "../controllers/voice.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const voiceRouter = Router();

voiceRouter.get("/", requireAuth, voiceController.list);
voiceRouter.get("/:id", requireAuth, voiceController.getById);
voiceRouter.get("/:id/preview", requireAuth, voiceController.preview);
voiceRouter.patch("/:id", requireAuth, requireCsrf, voiceController.update);
voiceRouter.delete("/:id", requireAuth, requireCsrf, voiceController.remove);

export default voiceRouter;
