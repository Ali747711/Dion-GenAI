import path from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach } from "vitest";

import { closeDb, db } from "../src/db/client";
import { budgetConfig, ledgerEntries } from "../src/db/schema";
import { resolveDatabaseUrl } from "../src/config/env";
import { LedgerKind, LedgerSource } from "../src/libs/enums/job.enum";

export const TEST_OWNER_PASSWORD = "studio-dev";

beforeAll(async () => {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString.includes("test")) {
    throw new Error(`Refusing to run tests against a non-test database: ${connectionString}`);
  }

  const migrationClient = postgres(connectionString, { max: 1 });
  const migrationDb = drizzle(migrationClient);
  await migrate(migrationDb, { migrationsFolder: path.join(__dirname, "..", "drizzle") });
  await migrationClient.end();
});

export async function resetDatabase(): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE ledger_entries, job_outbox, variants, assets, jobs, projects, sessions, budget_config, uploads, voices RESTART IDENTITY CASCADE`
  );

  await db.insert(budgetConfig).values({
    id: 1,
    startingAllocation: 100_000,
    reserveCredits: 10_000,
    envelopes: [
      { key: "music", label: "Original songs & covers", allocated: 70_000 },
      { key: "supporting", label: "Supporting audio & artwork", allocated: 15_000 },
      { key: "validation", label: "Live integration validation", allocated: 5_000 },
    ],
    maxConcurrentPaidJobs: 1,
  });

  await db.insert(ledgerEntries).values({
    jobId: null,
    kind: LedgerKind.ALLOCATION,
    credits: 100_000,
    source: LedgerSource.OWNER,
    pricingVersion: "test-fixture",
    note: "Test fixture allocation",
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDb();
});
