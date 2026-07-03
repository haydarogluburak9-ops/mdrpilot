import "server-only";
import type { DocumentKind } from "@prisma/client";
import type { AiProvider } from "@/lib/ai/types";
import { analyzeComplianceSnapshot } from "@/lib/compliance/engine";
import { evaluateAudit, type AnsweredQuestion } from "@/lib/audit-sim/engine";
import { augmentAudit } from "@/lib/audit-sim/ai";
import { composeDocument, type ComposerContext } from "@/lib/composer/engine";
import { analyzeFile } from "@/lib/files/analysis";
import { retrieveClauses } from "@/lib/rag/retriever";
import { buildProduct, buildSnapshot, type GoldenCase } from "./datasets";
import { setMetrics, matches, pct, clamp100, weightedMean, type SetMetrics } from "./metrics";

// ---------------- Result types ----------------

export interface ConsultantEval {
  precision: number; // 0..100
  recall: number;
  f1: number;
  gapDetectionAccuracy: number; // = f1 (0..100)
  complianceAccuracy: number; // overall score proximity / detection quality
  citationQuality: number;
  evidenceUsage: number;
  hallucinationRisk: number; // lower better
  matched: string[];
  missed: string[];
  falseAlarms: string[];
  predictedGaps: string[];
  modelOverallScore: number;
  confidence: number;
}

export interface AuditEval {
  majorAccuracy: number;
  minorAccuracy: number;
  observationAccuracy: number;
  capaAccuracy: number;
  findingAccuracy: number; // f1
  precision: number;
  recall: number;
  score: number; // engine score
}

export interface ComposerEval {
  documentQuality: number;
  citationQuality: number;
  sectionCoverage: number;
  emptySections: number;
  missingInfoHonesty: number;
  hallucinationRisk: number; // lower better
  aiModel: string;
}

export interface FileEval {
  kindCorrect: boolean;
  standardsRecall: number;
  fileScore: number;
}

export interface CaseEvalResult {
  caseId: string;
  title: string;
  latencyMs: number;
  consultant: ConsultantEval;
  audit?: AuditEval;
  composer?: ComposerEval;
  fileAnalysis?: FileEval;
  overall: number;
}

export interface EvalContext {
  companyId: string;
  companyName: string;
  provider?: AiProvider | null; // override; undefined = use env-configured provider
}

// ---------------- Consultant ----------------

async function evalConsultant(c: GoldenCase, ctx: EvalContext): Promise<ConsultantEval> {
  const snap = buildSnapshot(c, ctx.companyId, ctx.companyName);
  const result = await analyzeComplianceSnapshot(snap, c.standardScope, ctx.provider);

  const predictedGaps = result.gaps.map((g) => g.title);
  const gapM: SetMetrics = setMetrics(predictedGaps, c.expected.gaps);

  // Citation quality: do produced citations cover the expected clauses?
  const predictedClauses = result.citations.map((x) => `${x.standardCode} ${x.clauseNo} ${x.reason}`);
  const citM = setMetrics(predictedClauses, c.expected.clauses);

  // Evidence usage: do recommended actions / evidenceNeeded mention expected evidence?
  const predictedEvidence = [
    ...result.gaps.flatMap((g) => g.evidenceNeeded ?? []),
    ...result.gaps.map((g) => g.recommendedAction),
  ];
  const evM = setMetrics(predictedEvidence, c.expected.evidence);

  // Hallucination risk for consultant = false alarms / total predicted (lower better).
  const totalPredicted = predictedGaps.length || 1;
  const hallucinationRisk = clamp100((gapM.falsePositives / totalPredicted) * 100);

  // Compliance accuracy blends detection F1 with citation recall.
  const complianceAccuracy = clamp100(weightedMean([
    { value: pct(gapM.f1), weight: 0.7 },
    { value: pct(citM.recall), weight: 0.3 },
  ]));

  return {
    precision: pct(gapM.precision),
    recall: pct(gapM.recall),
    f1: pct(gapM.f1),
    gapDetectionAccuracy: pct(gapM.f1),
    complianceAccuracy,
    citationQuality: pct(citM.f1),
    evidenceUsage: pct(evM.recall),
    hallucinationRisk,
    matched: gapM.matched,
    missed: gapM.missed,
    falseAlarms: gapM.falseAlarms,
    predictedGaps,
    modelOverallScore: result.overallScore,
    confidence: Math.round(result.confidence * 100),
  };
}

// ---------------- Audit ----------------

function severityAccuracy(
  predicted: { severity: string; label: string }[],
  expected: { severity: string; label: string }[],
  sev: string,
): number {
  const exp = expected.filter((e) => e.severity === sev);
  if (exp.length === 0) return 100; // nothing expected → no penalty
  let found = 0;
  for (const e of exp) {
    if (predicted.some((p) => p.severity === sev && matches(p.label, e.label, 0.3))) found++;
  }
  return clamp100((found / exp.length) * 100);
}

async function evalAudit(c: GoldenCase, ctx: EvalContext): Promise<AuditEval | undefined> {
  if (!c.audit) return undefined;
  const snap = buildSnapshot(c, ctx.companyId, ctx.companyName);
  const answers: AnsweredQuestion[] = c.audit.answers.map((a) => ({
    standardCode: a.standardCode,
    clauseNo: a.clauseNo,
    question: a.question,
    expectedEvidence: a.expectedEvidence,
    weight: a.weight,
    answerText: a.answerText,
  }));

  const deterministic = evaluateAudit(answers, snap);
  const { findings, summary } = await augmentAudit(
    deterministic, answers, snap, c.audit.standard, c.audit.assessmentType, ctx.provider,
  );

  const predicted = findings.map((f) => ({
    severity: f.severity,
    label: `${f.clauseNo} ${f.description}`,
  }));
  const expected = c.audit.expectedFindings.map((f) => ({ severity: f.severity, label: f.label }));

  const predLabels = predicted.map((p) => p.label);
  const expLabels = expected.map((e) => e.label);
  const m = setMetrics(predLabels, expLabels, 0.3);

  const capaM = setMetrics(summary.capaSuggestions.map((x) => x.title), c.audit.expectedCapa, 0.3);

  return {
    majorAccuracy: severityAccuracy(predicted, expected, "MAJOR"),
    minorAccuracy: severityAccuracy(predicted, expected, "MINOR"),
    observationAccuracy: severityAccuracy(predicted, expected, "OBSERVATION"),
    capaAccuracy: pct(capaM.f1),
    findingAccuracy: pct(m.f1),
    precision: pct(m.precision),
    recall: pct(m.recall),
    score: summary.score,
  };
}

// ---------------- Composer ----------------

function composerContext(c: GoldenCase, companyName: string, clauses: ComposerContext["clauses"]): ComposerContext {
  const product = buildProduct(c);
  return {
    companyId: "eval",
    company: { name: companyName, legalName: companyName, country: "Türkiye", notifiedBody: null },
    product: {
      name: product.name, brand: product.brand ?? null, model: product.model ?? null,
      deviceClass: product.deviceClass, basicUdiDi: product.basicUdiDi ?? null, udiDi: product.udiDi ?? null,
      intendedPurpose: product.intendedPurpose ?? null, indications: product.indications ?? null,
      contraindications: product.contraindications ?? null, isSterile: product.isSterile,
      sterilization: product.sterilization, isInvasive: product.isInvasive,
      containsSoftware: product.containsSoftware, hasMeasuringFn: product.hasMeasuringFn,
      materials: product.materials ?? null, packagingType: product.packagingType ?? null,
      shelfLife: product.shelfLife ?? null, appliedStandards: product.appliedStandards ?? null,
    },
    gspr: product.gsprItems.map((g) => ({
      gsprNo: g.gsprNo, requirementSummary: g.requirementSummary, status: g.status,
      applicable: g.applicable, evidenceFiles: [],
    })),
    risks: product.riskItems.map((r) => ({
      hazard: r.hazard, harm: r.harm ?? null, initialRiskLevel: r.initialRiskLevel,
      residualRiskLevel: r.residualRiskLevel, riskControlMeasure: r.riskControlMeasure ?? null, evidenceFiles: [],
    })),
    sections: product.technicalSections.map((s) => ({ title: s.title, status: s.status, evidenceFiles: [] })),
    qmsDocs: c.snapshot.qmsTitles.map((t) => ({ code: null, title: t, standard: "ISO 13485", status: "APPROVED" })),
    files: [],
    linkedEvidence: [],
    clauses,
  };
}

async function evalComposer(c: GoldenCase, ctx: EvalContext): Promise<ComposerEval | undefined> {
  if (!c.composer) return undefined;

  const clauses = await retrieveClauses(
    ctx.companyId,
    `${c.product.name} ${c.standardScope} ${c.composer.type}`,
    6,
  ).catch(() => []);

  const cc = composerContext(c, ctx.companyName, clauses);
  const { result, aiModel } = await composeDocument(cc, { type: c.composer.type, language: "en" }, ctx.provider);

  const headings = result.sections.map((s) => s.heading);
  const coverage = setMetrics(headings, c.composer.requiredSections, 0.3);

  const emptySections = result.sections.filter((s) => s.content.trim().length < 20).length;
  const hasCitations = result.citations.length > 0;

  // Missing-info honesty: known-missing product fields should be flagged.
  const knownMissing: string[] = [];
  if (!c.product.intendedPurpose) knownMissing.push("intended purpose");
  if (!c.product.indications) knownMissing.push("indications");
  if (!c.product.basicUdiDi) knownMissing.push("udi");
  if (!c.product.materials) knownMissing.push("materials");
  const flaggedText = [...result.missingInformation, ...result.sections.map((s) => s.content)].join(" ").toLowerCase();
  const flagged = knownMissing.filter((k) => flaggedText.includes(k) || result.markdown.includes("[TO BE CONFIRMED]"));
  const missingInfoHonesty = knownMissing.length ? clamp100((flagged.length / knownMissing.length) * 100) : 100;

  // Hallucination risk: inventing specifics for unknown fields without flagging → risk.
  // Heuristic: penalise empty sections and dishonesty about missing info.
  const hallucinationRisk = clamp100(100 - missingInfoHonesty * 0.7 - (emptySections === 0 ? 30 : 0));

  const documentQuality = clamp100(weightedMean([
    { value: pct(coverage.recall), weight: 0.4 },
    { value: hasCitations ? 100 : 0, weight: 0.2 },
    { value: emptySections === 0 ? 100 : 50, weight: 0.2 },
    { value: missingInfoHonesty, weight: 0.2 },
  ]));

  // Citation quality vs expected clauses.
  const predictedClauses = result.citations.map((x) => `${x.standardCode} ${x.clauseNo} ${x.reason}`);
  const citM = setMetrics(predictedClauses, c.expected.clauses);

  return {
    documentQuality,
    citationQuality: pct(citM.f1),
    sectionCoverage: pct(coverage.recall),
    emptySections,
    missingInfoHonesty,
    hallucinationRisk,
    aiModel,
  };
}

// ---------------- File analysis ----------------

async function evalFile(c: GoldenCase, ctx: EvalContext): Promise<FileEval | undefined> {
  if (!c.fileAnalysis) return undefined;
  const product = buildProduct(c);
  const res = await analyzeFile({
    fileName: c.fileAnalysis.fileName,
    documentKind: c.fileAnalysis.documentKind as DocumentKind,
    mimeType: "application/pdf",
    extractedText: c.fileAnalysis.text,
    product: {
      name: product.name,
      deviceClass: product.deviceClass,
      gsprItems: product.gsprItems.map((g) => ({ id: g.id, gsprNo: g.gsprNo, requirementSummary: g.requirementSummary })),
      technicalSections: product.technicalSections.map((s) => ({ id: s.id, key: s.key, title: s.title })),
      riskItems: product.riskItems.map((r) => ({ id: r.id, hazard: r.hazard })),
    },
    companyId: ctx.companyId,
  }, ctx.provider);

  const kindCorrect = res.detectedDocumentKind.toUpperCase() === c.fileAnalysis.expectedKind.toUpperCase();
  const stdM = setMetrics(res.relatedStandards, c.fileAnalysis.expectedStandards, 0.3);
  const fileScore = clamp100(weightedMean([
    { value: kindCorrect ? 100 : 0, weight: 0.5 },
    { value: pct(stdM.recall), weight: 0.5 },
  ]));

  return { kindCorrect, standardsRecall: pct(stdM.recall), fileScore };
}

// ---------------- Orchestration ----------------

export async function evaluateCase(c: GoldenCase, ctx: EvalContext): Promise<CaseEvalResult> {
  const started = Date.now();
  const [consultant, audit, composer, fileAnalysis] = await Promise.all([
    evalConsultant(c, ctx),
    evalAudit(c, ctx),
    evalComposer(c, ctx),
    evalFile(c, ctx),
  ]);

  const parts: { value: number; weight: number }[] = [
    { value: consultant.gapDetectionAccuracy, weight: 0.3 },
    { value: consultant.complianceAccuracy, weight: 0.15 },
    { value: 100 - consultant.hallucinationRisk, weight: 0.1 },
  ];
  if (audit) parts.push({ value: audit.findingAccuracy, weight: 0.2 });
  if (composer) parts.push({ value: composer.documentQuality, weight: 0.15 });
  if (fileAnalysis) parts.push({ value: fileAnalysis.fileScore, weight: 0.1 });

  const overall = clamp100(weightedMean(parts));

  return {
    caseId: c.id,
    title: c.title,
    latencyMs: Date.now() - started,
    consultant,
    audit,
    composer,
    fileAnalysis,
    overall,
  };
}
