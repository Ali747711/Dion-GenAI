import { Router } from "express";

import { uploadController } from "../controllers/upload.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";

const uploadRouter = Router();

uploadRouter.post("/", requireAuth, requireCsrf, uploadController.create);
uploadRouter.get("/:id", requireAuth, uploadController.getById);

export default uploadRouter;
