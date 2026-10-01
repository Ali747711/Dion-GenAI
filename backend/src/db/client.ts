import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resolveDatabaseUrl } from "../config/env";
import * as schema from "./schema";

const connectionString = resolveDatabaseUrl();

export const queryClient = postgres(connectionString, { max: 10 });

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

/** Structural subset implemented by both `db` and a `db.transaction` callback's `tx`. */
export type Executor = Pick<Database, "select" | "insert" | "update" | "delete" | "execute">;

export async function closeDb(): Promise<void> {
  await queryClient.end({ timeout: 5 });
}
