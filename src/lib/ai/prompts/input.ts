import { z } from "zod";

// Shared, defensive input schema for product-centric prompts.
export const productInputSchema = z.object({
  name: z.string(),
  deviceClass: z.string(),
  intendedPurpose: z.string().optional(),
  isSterile: z.boolean().optional(),
  sterilization: z.string().optional(),
  containsSoftware: z.boolean().optional(),
  isInvasive: z.boolean().optional(),
  hasMeasuringFn: z.boolean().optional(),
  materials: z.string().optional(),
  indications: z.string().optional(),
  contraindications: z.string().optional(),
  bodyContactDuration: z.string().optional(),
  extra: z.string().optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export function describeProduct(p: ProductInput): string {
  const flags: string[] = [];
  if (p.isSterile) flags.push(`sterile (${p.sterilization ?? "method n/a"})`);
  else flags.push("non-sterile");
  if (p.containsSoftware) flags.push("contains software");
  if (p.isInvasive) flags.push("invasive");
  if (p.hasMeasuringFn) flags.push("measuring function");

  return [
    `Device: ${p.name}`,
    `Class: ${p.deviceClass}`,
    `Intended purpose: ${p.intendedPurpose ?? "n/a"}`,
    `Characteristics: ${flags.join(", ")}`,
    p.materials ? `Materials: ${p.materials}` : "",
    p.indications ? `Indications: ${p.indications}` : "",
    p.contraindications ? `Contraindications: ${p.contraindications}` : "",
    p.bodyContactDuration ? `Body contact duration: ${p.bodyContactDuration}` : "",
    p.extra ? `Additional context: ${p.extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
