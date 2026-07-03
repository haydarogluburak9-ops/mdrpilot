import { z } from "zod";

export const sterilizationEnum = z.enum(["NON_STERILE", "EO", "GAMMA", "STEAM", "OTHER"]);

export const modelVariantSchema = z.object({
  name: z.string().trim().max(200),
  sterilizations: z.array(sterilizationEnum).max(5).default([]),
});

export const brandVariantSchema = z.object({
  brand: z.string().trim().max(200),
  models: z.array(modelVariantSchema).max(2000).default([]),
});

export const productVariantsSchema = z.array(brandVariantSchema).max(50).default([]);
