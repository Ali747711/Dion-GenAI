import { Router } from "express";

import { assetController } from "../controllers/asset.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const assetRouter = Router();

assetRouter.get("/", requireAuth, assetController.list);
assetRouter.get("/:id", requireAuth, assetController.getById);
assetRouter.patch("/:id", requireAuth, requireCsrf, assetController.update);
assetRouter.get("/:id/content", requireAuth, assetController.content);
assetRouter.get("/:id/download", requireAuth, assetController.download);

export default assetRouter;
