import { env } from "../config/env";
import type { ConnectionStatus } from "../libs/types/capability";

export const connectionService = {
  getStatus(): ConnectionStatus {
    const mode = env.NOIZ_MODE;
    const status = mode === "mock" ? "configured" : env.NOIZ_API_KEY ? "configured" : "missing";
    return { mode, status, checkedAt: new Date().toISOString() };
  },
};
