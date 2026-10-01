import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Backing store for express-session (see services/session-store.service.ts). */
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
