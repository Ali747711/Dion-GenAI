/* Runs pending Drizzle migrations against the configured database. */
import path from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resolveDatabaseUrl } from "../config/env";

async function main(): Promise<void> {
  const connectionString = resolveDatabaseUrl();
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  // eslint-disable-next-line no-console
  console.log(`Running migrations against ${connectionString.replace(/:[^:@]*@/, ":***@")}`);
  await migrate(db, { migrationsFolder: path.join(__dirname, "..", "..", "drizzle") });
  // eslint-disable-next-line no-console
  console.log("Migrations complete.");

  await migrationClient.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
