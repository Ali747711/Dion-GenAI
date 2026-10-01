import "express-session";

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
    csrfToken?: string;
  }
}

export interface SessionState {
  authenticated: boolean;
  owner: { name: string } | null;
  csrfToken: string;
}
