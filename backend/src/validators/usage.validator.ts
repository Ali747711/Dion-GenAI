import { z } from "zod";

export const reconciliationSchema = z.object({
  credits: z.number().int(),
  reason: z.string().min(1).max(1000),
  source: z.string().min(1).max(200),
});

export const ledgerListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

const envelopeSchema = z.object({
  key: z.enum(["music", "supporting", "validation"]),
  label: z.string().min(1).max(100),
  allocated: z.number().int().nonnegative(),
});

const usdDecimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, "Must be a non-negative decimal string with up to 6 decimal places");

export const budgetUpdateSchema = z
  .object({
    startingAllocation: z.number().int().nonnegative().optional(),
    reserveCredits: z.number().int().nonnegative().optional(),
    envelopes: z.array(envelopeSchema).optional(),
    usdMonthlyCap: usdDecimalStringSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });
