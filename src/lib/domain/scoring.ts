import type { Product } from "./types";

export interface ScoreBreakdown {
  label: string;
  weight: number;
  value: number; // 0-100
}

export type ScoreBand = "red" | "yellow" | "green";

export function bandFromScore(score: number): ScoreBand {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

function ratio(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * Audit readiness scoring engine.
 * Combines weighted completion ratios across the regulatory dossier.
 */
export function computeAuditReadiness(product: Product): {
  score: number;
  band: ScoreBand;
  breakdown: ScoreBreakdown[];
} {
  // Exclude sections that are not applicable to this device from completeness.
  const sections = (product.technicalSections ?? []).filter((s) => s.applicable !== false);
  const techDone = sections.filter((s) => s.status === "APPROVED").length;
  const techRatio = ratio(techDone, sections.length || 1);

  const gspr = product.gsprItems ?? [];
  const applicable = gspr.filter((g) => g.applicable !== "NO");
  const gsprWithEvidence = applicable.filter(
    (g) => g.evidenceDocument && g.status === "APPROVED",
  ).length;
  const gsprRatio = ratio(gsprWithEvidence, applicable.length || 1);

  const risks = product.riskItems ?? [];
  const riskControlled = risks.filter(
    (r) => r.riskControlMeasure && r.verificationOfControl,
  ).length;
  const riskRatio = ratio(riskControlled, risks.length || 1);

  const hasRiskFile = (product.riskItems ?? []).length > 0;
  const hasPsurPms = sections.some(
    (s) => (s.key === "psur-report" || s.key === "pms-plan") && s.status !== "MISSING",
  );
  const ifuRiskAlignment = risks.length > 0 ? Math.min(riskRatio + 10, 100) : 60;

  const breakdown: ScoreBreakdown[] = [
    { label: "Technical file completeness", weight: 0.25, value: techRatio },
    { label: "GSPR evidence coverage", weight: 0.2, value: gsprRatio },
    { label: "Risk file completeness", weight: 0.2, value: riskRatio },
    { label: "IFU / risk alignment", weight: 0.1, value: ifuRiskAlignment },
    { label: "PSUR / PMS report (TF reference)", weight: 0.1, value: hasPsurPms ? 100 : 0 },
    { label: "Risk management module", weight: 0.15, value: hasRiskFile ? 100 : 0 },
  ];

  const score = Math.round(
    breakdown.reduce((acc, b) => acc + b.value * b.weight, 0),
  );

  return { score, band: bandFromScore(score), breakdown };
}
