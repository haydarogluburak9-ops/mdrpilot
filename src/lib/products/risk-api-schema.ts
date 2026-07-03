import { z } from "zod";

const score = z.coerce.number().int().min(1).max(5);
const optText = (max: number) => z.string().trim().max(max).optional().nullable();

export const riskMitigationSchema = z.object({
  category: z.enum(["DESIGN", "PRODUCTION", "POST_MARKET"]),
  actions: z.string().max(8000).optional().default(""),
  residualSeverity: score.default(1),
  residualProbability: score.default(1),
});

export const riskItemBodySchema = z.object({
  sequenceNo: z.coerce.number().int().min(1).max(999).optional(),
  riskNo: optText(50),
  hazard: z.string().trim().min(1, "risk.api.err.hazardRequired").max(500),
  sequenceOfEvents: optText(2000),
  hazardousSituation: optText(8000),
  harm: optText(2000),
  riskSource: optText(4000),
  initialSeverity: score.default(1),
  initialProbability: score.default(1),
  mitigations: z.array(riskMitigationSchema).optional().nullable(),
  riskControlMeasure: optText(8000),
  residualSeverity: score.optional(),
  residualProbability: score.optional(),
  residualAssessment: optText(8000),
  benefitRiskJustification: optText(2000),
  verificationOfControl: optText(2000),
  linkedReferences: optText(500),
  tableERef: optText(32),
  narrativeContext: z
    .object({
      intendedPurpose: optText(2000),
      productName: optText(500),
      locale: z.enum(["tr", "en"]).optional(),
    })
    .optional(),
});
