import { Store, type SessionData } from "express-session";
import { eq, lt } from "drizzle-orm";

import { db } from "../db/client";
import { sessions } from "../db/schema";
import { logger } from "../libs/utils/logger";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Drizzle-backed express-session store (replaces connect-pg-simple / the
 * Mongoose session pattern from the base skill). Owner-only workspace, so a
 * single small table is enough — no Redis needed.
 */
export class PgSessionStore extends Store {
  public get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    db.select()
      .from(sessions)
      .where(eq(sessions.sid, sid))
      .limit(1)
      .then((rows) => {
        const row = rows[0];
        if (!row || row.expiresAt.getTime() < Date.now()) {
          callback(null, null);
          return;
        }
        callback(null, row.sess as SessionData);
      })
      .catch((error: unknown) => callback(error));
  }

  public set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const maxAgeMs = session.cookie?.maxAge ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + maxAgeMs);

    db.insert(sessions)
      .values({ sid, sess: session, expiresAt })
      .onConflictDoUpdate({ target: sessions.sid, set: { sess: session, expiresAt } })
      .then(() => callback?.())
      .catch((error: unknown) => callback?.(error));
  }

  public destroy(sid: string, callback?: (err?: unknown) => void): void {
    db.delete(sessions)
      .where(eq(sessions.sid, sid))
      .then(() => callback?.())
      .catch((error: unknown) => callback?.(error));
  }

  public touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const maxAgeMs = session.cookie?.maxAge ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + maxAgeMs);

    db.update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.sid, sid))
      .then(() => callback?.())
      .catch((error: unknown) => callback?.(error));
  }

  public async pruneExpired(): Promise<void> {
    try {
      await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    } catch (error) {
      logger.warn({ err: error }, "Failed to prune expired sessions");
    }
  }
}
