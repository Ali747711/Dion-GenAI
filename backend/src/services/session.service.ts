import { randomBytes } from "node:crypto";

import argon2 from "argon2";

import { env } from "../config/env";

export const sessionService = {
  async verifyPassword(password: string): Promise<boolean> {
    try {
      return await argon2.verify(env.OWNER_PASSWORD_HASH, password);
    } catch {
      return false;
    }
  },

  generateCsrfToken(): string {
    return randomBytes(24).toString("hex");
  },

  ownerName(): string {
    return env.OWNER_NAME;
  },
};
