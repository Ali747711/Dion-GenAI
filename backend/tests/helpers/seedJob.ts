import { randomUUID } from "node:crypto";

import { JobKind } from "../../src/libs/enums/job.enum";
import { setMusicProviderForTests } from "../../src/services/provider/provider.factory";
import { jobService } from "../../src/services/job.service";
import { processJobTick } from "../../src/worker/jobProcessor";
import { FakeProvider } from "./fakeProvider";
import { FIXTURE_AUDIO_PATH, validMusicInput } from "./fixtures";

/** Drives a brand-new job all the way to `succeeded` using a scripted FakeProvider, with no real waiting. */
export async function seedSucceededJob(): Promise<{ jobId: string; assetIds: [string, string] }> {
  const provider = new FakeProvider();
  provider.pollScripts = {
    0: [{ status: "succeeded", durationSeconds: 12.3, resultLocation: FIXTURE_AUDIO_PATH }],
    1: [{ status: "succeeded", durationSeconds: 15.1, resultLocation: FIXTURE_AUDIO_PATH }],
  };
  setMusicProviderForTests(provider);

  const outcome = await jobService.createJob({ kind: JobKind.MUSIC, idempotencyKey: randomUUID(), input: validMusicInput() });
  await processJobTick(outcome.job.id, provider); // submit
  await processJobTick(outcome.job.id, provider); // poll -> both succeed -> settle

  const job = await jobService.getJob(outcome.job.id);
  const assetIds = job.variants.map((v) => v.assetId).filter((id): id is string => Boolean(id));
  if (assetIds.length !== 2) throw new Error("Expected both variants to have produced an asset");

  setMusicProviderForTests(null);
  return { jobId: job.id, assetIds: [assetIds[0] as string, assetIds[1] as string] };
}
