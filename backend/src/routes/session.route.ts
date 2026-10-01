import { Router } from "express";

import { sessionController } from "../controllers/session.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireCsrf } from "../middlewares/csrf.middleware";
import { globalFailedLoginLimiter, loginRateLimiter } from "../middlewares/rateLimit.middleware";

const sessionRouter = Router();

// Only GET/POST /api/v1/session are exempt from the auth requirement (they
// ARE the auth flow) per the contract; DELETE still requires a session.
// Every non-GET request here still requires CSRF.
sessionRouter.get("/", sessionController.getSession);
sessionRouter.post("/", globalFailedLoginLimiter, loginRateLimiter, requireCsrf, sessionController.login);
sessionRouter.delete("/", requireAuth, requireCsrf, sessionController.logout);

export default sessionRouter;
