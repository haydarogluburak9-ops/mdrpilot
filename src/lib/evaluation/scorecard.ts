import "server-only";
import { clamp100, mean, weightedMean } from "./metrics";
import type { CaseEvalResult } from "./evaluator";

export interface Scorecard {
  provider: string;
  model: string;
  cases: number;
  // Module scores (0..100)
  consultantScore: number;
  composerScore: number;
  auditScore: number;
  fileAnalysisScore: number;
  citationScore: number;
  documentQualityScore: number;
  complianceAccuracy: number;
  evidenceUsageScore: number;
  gapDetectionAccuracy: number;
  auditFindingAccuracy: number;
  hallucinationRisk: number; // lower better
  // Consultant set metrics (aggregate)
  precision: number;
  recall: number;
  f1: number;
  // Overall
  overallAiScore: number;
  consultantProximityPercent: number;
  avgLatencyMs: number;
  estCostUsdPerRun: number;
  perCase: CaseEvalResult[];
}

// Rough public pricing (USD per 1M tokens) keyed by model substring. Used for an
// ESTIMATE only — providers do not return token usage through the string contract.
const PRICE: { match: RegExp; in: number; out: number }[] = [
  { match: /gpt-5/i, in: 1.25, out: 10 },
  { match: /gpt-4o-mini/i, in: 0.15, out: 0.6 },
  { match: /gpt-4o|gpt-4\.1/i, in: 2.5, out: 10 },
  { match: /claude-3-5-haiku|claude.*haiku/i, in: 0.8, out: 4 },
  { match: /claude-3-opus|claude.*opus/i, in: 15, out: 75 },
  { match: /claude/i, in: 3, out: 15 },
];

// Assumed average tokens per AI call (input/output) and AI calls per case.
const EST_INPUT_TOKENS = 1600;
const EST_OUTPUT_TOKENS = 1400;
const EST_CALLS_PER_CASE = 4; // consultant + audit + composer + file analysis

function estCost(model: string, cases: number): number {
  const row = PRICE.find((p) => p.match.test(model));
  if (!row) return 0;
  const inTok = (EST_INPUT_TOKENS * EST_CALLS_PER_CASE * cases) / 1_000_000;
  const outTok = (EST_OUTPUT_TOKENS * EST_CALLS_PER_CASE * cases) / 1_000_000;
  return Number((inTok * row.in + outTok * row.out).toFixed(4));
}

function avg(nums: number[]): number {
  return nums.length ? clamp100(mean(nums)) : 0;
}

export function buildScorecard(provider: string, model: string, results: CaseEvalResult[]): Scorecard {
  const cases = results.length;

  const consultantGap = results.map((r) => r.consultant.gapDetectionAccuracy);
  const complianceAccuracy = avg(results.map((r) => r.consultant.complianceAccuracy));
  const evidenceUsageScore = avg(results.map((r) => r.consultant.evidenceUsage));
  const gapDetectionAccuracy = avg(consultantGap);

  const consultantCitation = results.map((r) => r.consultant.citationQuality);
  const composerCitation = results.filter((r) => r.composer).map((r) => r.composer!.citationQuality);
  const citationScore = avg([...consultantCitation, ...composerCitation]);

  const composerResults = results.filter((r) => r.composer);
  const documentQualityScore = avg(composerResults.map((r) => r.composer!.documentQuality));
  const composerScore = documentQualityScore;

  const auditResults = results.filter((r) => r.audit);
  const auditFindingAccuracy = avg(auditResults.map((r) => r.audit!.findingAccuracy));
  const auditScore = auditFindingAccuracy;

  const fileResults = results.filter((r) => r.fileAnalysis);
  const fileAnalysisScore = avg(fileResults.map((r) => r.fileAnalysis!.fileScore));

  // Consultant score blends gap detection and compliance accuracy.
  const consultantScore = clamp100(weightedMean([
    { value: gapDetectionAccuracy, weight: 0.7 },
    { value: complianceAccuracy, weight: 0.3 },
  ]));

  // Hallucination risk: blend consultant + composer (lower is better).
  const hallParts = [
    ...results.map((r) => r.consultant.hallucinationRisk),
    ...composerResults.map((r) => r.composer!.hallucinationRisk),
  ];
  const hallucinationRisk = hallParts.length ? clamp100(mean(hallParts)) : 0;

  // Aggregate precision/recall/f1 for the consultant module.
  const precision = avg(results.map((r) => r.consultant.precision));
  const recall = avg(results.map((r) => r.consultant.recall));
  const f1 = avg(results.map((r) => r.consultant.f1));

  // Overall AI score weights every module and subtracts a hallucination penalty.
  const overallAiScore = clamp100(weightedMean([
    { value: consultantScore, weight: 0.3 },
    { value: composerScore || consultantScore, weight: 0.2 },
    { value: auditScore || consultantScore, weight: 0.2 },
    { value: fileAnalysisScore || consultantScore, weight: 0.1 },
    { value: citationScore, weight: 0.1 },
    { value: 100 - hallucinationRisk, weight: 0.1 },
  ]));

  // "How close to a real ISO 13485 / MDR consultant" — a deliberately conservative
  // blend: detection + reasoning quality + citation grounding − hallucination,
  // capped because a real consultant also brings legal accountability the tool cannot.
  const consultantProximityPercent = clamp100(
    weightedMean([
      { value: gapDetectionAccuracy, weight: 0.35 },
      { value: complianceAccuracy, weight: 0.2 },
      { value: auditFindingAccuracy || gapDetectionAccuracy, weight: 0.15 },
      { value: citationScore, weight: 0.15 },
      { value: 100 - hallucinationRisk, weight: 0.15 },
    ]) * 0.9, // hard cap: never claim parity with an accountable human expert
  );

  const avgLatencyMs = Math.round(mean(results.map((r) => r.latencyMs)));

  return {
    provider, model, cases,
    consultantScore, composerScore, auditScore, fileAnalysisScore, citationScore,
    documentQualityScore, complianceAccuracy, evidenceUsageScore, gapDetectionAccuracy,
    auditFindingAccuracy, hallucinationRisk,
    precision, recall, f1,
    overallAiScore, consultantProximityPercent,
    avgLatencyMs,
    estCostUsdPerRun: estCost(model, cases),
    perCase: results,
  };
}
