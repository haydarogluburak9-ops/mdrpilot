import type { AiResult } from "@/lib/ai/types";
import type { RiskMitigationCategory, RiskMitigationRow } from "@/lib/domain/types";
import { RISK_MITIGATION_CATEGORIES } from "@/lib/domain/risk-template";

export interface SuggestedRisk {
  hazard: string;
  hazardousSituation?: string;
  harm?: string;
  riskSource?: string;
  initialSeverity: number;
  initialProbability: number;
  mitigations?: RiskMitigationRow[];
  riskControlMeasure?: string;
  residualSeverity: number;
  residualProbability: number;
  residualAssessment?: string;
  benefitRiskJustification?: string;
}

function clamp(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

function defaultResidual(severity: number, probability: number) {
  return {
    residualSeverity: severity,
    residualProbability: Math.max(1, probability - 1),
  };
}

const CATEGORY_ALIASES: Record<string, RiskMitigationCategory> = {
  DESIGN: "DESIGN",
  design: "DESIGN",
  tasarım: "DESIGN",
  Tasarım: "DESIGN",
  PRODUCTION: "PRODUCTION",
  production: "PRODUCTION",
  üretim: "PRODUCTION",
  Üretim: "PRODUCTION",
  POST_MARKET: "POST_MARKET",
  post_market: "POST_MARKET",
  "post-market": "POST_MARKET",
  "satış sonrası": "POST_MARKET",
  "Satış Sonrası": "POST_MARKET",
};

function parseMitigations(raw: unknown, fallbackResidual: { residualSeverity: number; residualProbability: number }) {
  if (!Array.isArray(raw)) return undefined;
  const byCat = new Map<RiskMitigationCategory, RiskMitigationRow>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const catKey = String(r.category ?? r.mitigationCategory ?? "");
    const category = CATEGORY_ALIASES[catKey] ?? CATEGORY_ALIASES[catKey.toLowerCase()];
    if (!category) continue;
    const actions =
      typeof r.actions === "string"
        ? r.actions.trim()
        : typeof r.controlMeasure === "string"
          ? r.controlMeasure.trim()
          : "";
    byCat.set(category, {
      category,
      actions,
      residualSeverity: clamp(typeof r.residualSeverity === "number" ? r.residualSeverity : fallbackResidual.residualSeverity),
      residualProbability: clamp(
        typeof r.residualProbability === "number" ? r.residualProbability : fallbackResidual.residualProbability,
      ),
    });
  }
  if (byCat.size === 0) return undefined;
  return RISK_MITIGATION_CATEGORIES.map(
    (category) =>
      byCat.get(category) ?? {
        category,
        actions: "",
        residualSeverity: fallbackResidual.residualSeverity,
        residualProbability: fallbackResidual.residualProbability,
      },
  );
}

function primaryLabel(r: Record<string, unknown>): string | null {
  if (typeof r.hazardousSituation === "string" && r.hazardousSituation.trim()) return r.hazardousSituation.trim();
  if (typeof r.hazard === "string" && r.hazard.trim()) return r.hazard.trim();
  return null;
}

/** Parse structured or string risk suggestions from an AI risk audit result. */
export function extractSuggestedRisks(result: AiResult): SuggestedRisk[] {
  const out: SuggestedRisk[] = [];
  const data = result.data as { risks?: unknown } | undefined;

  if (Array.isArray(data?.risks)) {
    for (const raw of data.risks) {
      if (typeof raw !== "object" || raw === null) continue;
      const r = raw as Record<string, unknown>;
      const label = primaryLabel(r);
      if (!label) continue;

      const initialSeverity = clamp(typeof r.severity === "number" ? r.severity : typeof r.initialSeverity === "number" ? r.initialSeverity : 3);
      const initialProbability = clamp(
        typeof r.probability === "number" ? r.probability : typeof r.initialProbability === "number" ? r.initialProbability : 2,
      );
      const hasResidual =
        typeof r.residualSeverity === "number" && typeof r.residualProbability === "number";
      const residual = hasResidual
        ? {
            residualSeverity: clamp(r.residualSeverity as number),
            residualProbability: clamp(r.residualProbability as number),
          }
        : defaultResidual(initialSeverity, initialProbability);

      const controlMeasure =
        typeof r.controlMeasure === "string"
          ? r.controlMeasure.trim()
          : typeof r.riskControlMeasure === "string"
            ? r.riskControlMeasure.trim()
            : undefined;

      const mitigations = parseMitigations(r.mitigations, residual);
      if (mitigations && controlMeasure) {
        const prod = mitigations.find((m) => m.category === "PRODUCTION");
        if (prod && !prod.actions) prod.actions = controlMeasure;
      }

      out.push({
        hazard: label.slice(0, 500),
        hazardousSituation: label,
        harm: typeof r.harm === "string" ? r.harm.trim() : undefined,
        riskSource: typeof r.riskSource === "string" ? r.riskSource.trim() : typeof r.source === "string" ? r.source.trim() : undefined,
        initialSeverity,
        initialProbability,
        mitigations,
        riskControlMeasure: controlMeasure,
        ...residual,
        residualAssessment:
          typeof r.residualAssessment === "string" ? r.residualAssessment.trim() : undefined,
        benefitRiskJustification:
          typeof r.benefitRiskJustification === "string"
            ? r.benefitRiskJustification.trim()
            : typeof r.benefitRisk === "string"
              ? r.benefitRisk.trim()
              : undefined,
      });
    }
    if (out.length > 0) return out;
  }

  for (const line of result.risks) {
    const parts = line.split(/\s*(?:→|->)\s*/);
    const hazard = parts[0]?.trim();
    if (!hazard) continue;
    const harm = parts[1]?.trim();
    const initialSeverity = 3;
    const initialProbability = 2;
    out.push({
      hazard,
      hazardousSituation: hazard,
      harm: harm || undefined,
      initialSeverity,
      initialProbability,
      ...defaultResidual(initialSeverity, initialProbability),
    });
  }

  return out;
}

export function hazardExistsInTable(hazard: string, existing: string[]) {
  const key = hazard.trim().toLowerCase();
  return existing.some((h) => h.trim().toLowerCase() === key);
}
