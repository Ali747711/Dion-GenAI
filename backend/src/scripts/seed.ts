/* eslint-disable no-console */
import { closeDb, db } from "../db/client";
import { budgetConfig, ledgerEntries } from "../db/schema";
import { PRICING_VERSION } from "../libs/configs";
import { LedgerKind, LedgerSource } from "../libs/enums/job.enum";
import type { BudgetEnvelopeConfig } from "../db/schema/budget";

const STARTING_ALLOCATION = 100_000;
const RESERVE_CREDITS = 10_000;

const ENVELOPES: BudgetEnvelopeConfig[] = [
  { key: "music", label: "Original songs & covers", allocated: 70_000 },
  { key: "supporting", label: "Supporting audio & artwork", allocated: 15_000 },
  { key: "validation", label: "Live integration validation", allocated: 5_000 },
];

async function main(): Promise<void> {
  const existing = await db.select().from(budgetConfig).limit(1);
  if (existing.length > 0) {
    console.log("Budget config already seeded; skipping.");
    return;
  }

  await db.insert(budgetConfig).values({
    id: 1,
    startingAllocation: STARTING_ALLOCATION,
    reserveCredits: RESERVE_CREDITS,
    envelopes: ENVELOPES,
    maxConcurrentPaidJobs: 1,
  });

  await db.insert(ledgerEntries).values({
    jobId: null,
    kind: LedgerKind.ALLOCATION,
    credits: STARTING_ALLOCATION,
    source: LedgerSource.OWNER,
    pricingVersion: PRICING_VERSION,
    note: "Initial owner-reported allocation",
  });

  console.log(
    `Seeded budget config: ${STARTING_ALLOCATION} allocation, ${RESERVE_CREDITS} reserve, envelopes music=70000/supporting=15000/validation=5000.`
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDb();
  });
