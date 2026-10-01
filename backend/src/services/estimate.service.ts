import { ESTIMATE_TTL_MS, PRICING_VERSION } from "../libs/configs";
import { BillingGroup, JOB_BILLING_GROUP, JobKind, UploadPurpose } from "../libs/enums/job.enum";
import AppError, { ErrorCode, Message } from "../libs/Errors";
import type { TranscriptionInput } from "../libs/types/audioStudio";
import type { Estimate } from "../libs/types/estimate";
import type { JobInput } from "../libs/types/job";
import { uploadRepository } from "../repositories/upload.repository";
import { computeBudgetSnapshot } from "./budgetMath.service";
import { priceJob } from "./pricing.service";
import { computeUsdBudgetSnapshot, isUsdCapUnset } from "./usdBudgetMath.service";

export const estimateService = {
  async estimate(kind: JobKind, input: JobInput): Promise<Estimate> {
    const billing = JOB_BILLING_GROUP[kind];

    let uploadDurationSeconds: number | null = null;
    if (kind === JobKind.TRANSCRIPTION) {
      const uploadId = (input as TranscriptionInput).uploadId;
      const upload = await uploadRepository.findById(uploadId);
      if (!upload) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { uploadId: "Upload not found or expired" } });
      }
      if (upload.purpose !== UploadPurpose.TRANSCRIPTION) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, {
          fields: { uploadId: `Upload purpose must be '${UploadPurpose.TRANSCRIPTION}' for this job kind` },
        });
      }
      uploadDurationSeconds = upload.durationSeconds;
    }

    const pricing = priceJob(kind, input, { uploadDurationSeconds });

    const [{ estimatedRemaining }, usdSnapshot] = await Promise.all([computeBudgetSnapshot(), computeUsdBudgetSnapshot()]);

    if (billing === BillingGroup.USD && isUsdCapUnset(usdSnapshot.monthlyCap)) {
      throw new AppError(ErrorCode.CAPABILITY_UNAVAILABLE, "Set a USD pay-as-you-go cap in Settings");
    }

    return {
      kind,
      billing,
      credits: pricing.credits,
      usd: pricing.usd,
      assumption: pricing.assumption,
      pricingVersion: PRICING_VERSION,
      verified: pricing.verified,
      availableCredits: estimatedRemaining,
      availableUsd: usdSnapshot.availableUsd,
      expiresAt: new Date(Date.now() + ESTIMATE_TTL_MS).toISOString(),
    };
  },
};
