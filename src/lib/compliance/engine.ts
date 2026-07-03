import "server-only";
import { DISCLAIMER } from "@/lib/domain/constants";
import { retrieveClauses } from "@/lib/rag/retriever";
import type { Product } from "@/lib/domain/types";
import {
  bandOf,
  SEVERITY_RANK,
  type CategoryScores,
  type Citation,
  type ComplianceGap,
  type ComplianceStandardScope,
  type ConsultantResult,
  type RoadmapWeek,
  type Severity,
  type TopAction,
} from "./types";
import type { ComplianceSnapshot } from "./snapshot";
import { loadComplianceSnapshot } from "./snapshot";
import { augmentConsultant } from "./ai";

function ratio(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

const EFFORT: Record<string, number> = {
  high: 70, medium: 45, low: 25,
};

// ---------------- Category scoring ----------------

function computeCategories(snap: ComplianceSnapshot): CategoryScores {
  const p = snap.product;
  const sections = p?.technicalSections ?? [];
  const gspr = p?.gsprItems ?? [];
  const risks = p?.riskItems ?? [];

  const technicalFile = ratio(sections.filter((s) => s.status === "APPROVED").length, sections.length);

  const applicable = gspr.filter((g) => g.applicable !== "NO");
  const gsprScore = ratio(applicable.filter((g) => g.evidenceDocument && g.status === "APPROVED").length, applicable.length);

  const risk = ratio(risks.filter((r) => r.riskControlMeasure && r.verificationOfControl).length, risks.length);

  const cer = sections.find((s) => s.key === "psur-report" || s.key === "pms-plan");
  const clinical = cer ? (cer.status === "APPROVED" ? 100 : cer.status === "MISSING" ? 0 : 50) : 0;

  const pmsSec = sections.find((s) => s.key === "pms-plan");
  const pms = pmsSec ? (pmsSec.status === "APPROVED" ? 100 : pmsSec.status === "MISSING" ? 0 : 50) : 0;

  const qms = ratio(snap.qms.approved, snap.qms.total);

  const evidenceBase = ratio(snap.evidence.itemsWithEvidence, snap.evidence.itemsTotal);
  const evidenceCoverage = snap.evidence.uploadedFiles === 0 && evidenceBase === 0 ? 0 : Math.min(100, evidenceBase + (snap.evidence.uploadedFiles > 0 ? 5 : 0));

  const composerQuality = snap.composer.total
    ? Math.round((ratio(snap.composer.approved, snap.composer.total) * 0.5) + snap.composer.avgConfidence * 100 * 0.5)
    : technicalFile;
  const documentationQuality = Math.round(composerQuality * 0.6 + technicalFile * 0.4);

  const traceableItems = [
    ...risks.map((r) => (r.linkedReferences ? 1 : 0)),
  ];
  const traceFromEvidence = ratio(snap.evidence.itemsWithEvidence, snap.evidence.itemsTotal);
  const traceFromRefs = ratio(traceableItems.filter(Boolean).length, traceableItems.length || 1);
  const traceability = Math.round(traceFromEvidence * 0.6 + traceFromRefs * 0.4);

  return {
    technicalFile, gspr: gsprScore, risk, clinical, pms, qms, evidenceCoverage, documentationQuality, traceability,
  };
}

const WEIGHTS: Record<ComplianceStandardScope, Partial<Record<keyof CategoryScores, number>>> = {
  MDR: { technicalFile: 0.2, gspr: 0.2, risk: 0.15, clinical: 0.15, pms: 0.1, evidenceCoverage: 0.1, traceability: 0.1 },
  ISO_13485: { qms: 0.3, technicalFile: 0.15, risk: 0.15, evidenceCoverage: 0.1, documentationQuality: 0.15, traceability: 0.15 },
  ISO_14971: { risk: 0.5, evidenceCoverage: 0.2, traceability: 0.2, documentationQuality: 0.1 },
  ISO_9001: { qms: 0.45, documentationQuality: 0.2, traceability: 0.15, technicalFile: 0.2 },
  COMBINED: {
    technicalFile: 0.13, gspr: 0.13, risk: 0.13, clinical: 0.1, pms: 0.1, qms: 0.13,
    evidenceCoverage: 0.1, documentationQuality: 0.08, traceability: 0.1,
  },
};

function overallFor(scope: ComplianceStandardScope, cats: CategoryScores): number {
  const w = WEIGHTS[scope];
  let sum = 0;
  let wsum = 0;
  for (const [k, weight] of Object.entries(w) as [keyof CategoryScores, number][]) {
    sum += cats[k] * weight;
    wsum += weight;
  }
  return Math.round(wsum > 0 ? sum / wsum : 0);
}

// ---------------- Gap detection ----------------

interface GapRule extends ComplianceGap {
  scopes: ComplianceStandardScope[];
}

function buildGaps(snap: ComplianceSnapshot): GapRule[] {
  const gaps: GapRule[] = [];
  const p = snap.product;
  const sections = p?.technicalSections ?? [];
  const gspr = p?.gsprItems ?? [];
  const risks = p?.riskItems ?? [];
  const section = (key: string) => sections.find((s) => s.key === key);
  const gsprItem = (no: string) => gspr.find((g) => g.gsprNo === no);
  const titles = snap.qms.titles.map((t) => t.toLowerCase());
  const hasProc = (kw: string) => titles.some((t) => t.includes(kw));

  const all = (...s: ComplianceStandardScope[]): ComplianceStandardScope[] => s;

  // MDR Annex II — device description
  const desc = section("device-description");
  if (!desc || desc.status !== "APPROVED") {
    gaps.push({
      scopes: all("MDR", "ISO_13485"),
      title: "Device Description Incomplete", severity: "Critical",
      standard: "MDR 2017/745", clause: "Annex II 1.1",
      requirementSummary: "The technical documentation must fully describe the device, variants, accessories and intended purpose.",
      whyItMatters: "Without a complete device description the notified body cannot assess scope or classification.",
      currentSituation: desc ? `Device description section is in status ${desc.status}.` : "No device description section exists.",
      recommendedAction: "Complete and approve the full product family structure, variants and intended purpose.",
      estimatedEffort: EFFORT.high, quickWin: false,
      dependencies: ["Product specifications"], evidenceNeeded: ["Product specifications", "Variant list"], confidence: 0.92,
    });
  }

  // Biocompatibility (GSPR 10.1)
  const bio = gsprItem("10.1");
  if (bio && bio.applicable !== "NO" && (!bio.evidenceDocument || bio.status === "MISSING")) {
    gaps.push({
      scopes: all("MDR", "ISO_14971"),
      title: "Biocompatibility Evidence Missing", severity: "Critical",
      standard: "MDR 2017/745", clause: "Annex I 10.1",
      requirementSummary: "Chemical, physical and biological properties must be evaluated (ISO 10993).",
      whyItMatters: "Patient-contacting devices require biological safety evidence to demonstrate safety.",
      currentSituation: "No approved biocompatibility evidence is linked to GSPR 10.1.",
      recommendedAction: "Perform/collect ISO 10993 biological evaluation and link the report as evidence.",
      estimatedEffort: 80, quickWin: false,
      dependencies: ["Material list"], evidenceNeeded: ["ISO 10993 biological evaluation report"], confidence: 0.9,
    });
  }

  // Sterilization (sterile + GSPR 11.2)
  if (p?.isSterile) {
    const ster = gsprItem("11.2");
    if (!ster || (ster.applicable !== "NO" && (!ster.evidenceDocument || ster.status === "MISSING"))) {
      gaps.push({
        scopes: all("MDR", "ISO_13485"),
        title: "Sterilization Validation Missing", severity: "Critical",
        standard: "MDR 2017/745", clause: "Annex I 11.2",
        requirementSummary: "Devices supplied sterile must be manufactured and sterilized using validated methods (ISO 11135 / ISO 11607).",
        whyItMatters: "Unvalidated sterilization invalidates the sterility claim and CE conformity.",
        currentSituation: "The device is marked sterile but no sterilization validation evidence is linked.",
        recommendedAction: "Add sterilization validation and packaging validation reports as evidence.",
        estimatedEffort: 75, quickWin: false,
        dependencies: ["Sterilization method"], evidenceNeeded: ["Sterilization validation report", "Packaging validation (ISO 11607)"], confidence: 0.9,
      });
    }
  }

  // GSPR evidence coverage
  const applicable = gspr.filter((g) => g.applicable !== "NO");
  const missingGspr = applicable.filter((g) => !g.evidenceDocument || g.status === "MISSING");
  if (missingGspr.length > 0) {
    gaps.push({
      scopes: all("MDR"),
      title: `GSPR Evidence Gaps (${missingGspr.length})`, severity: missingGspr.length > 3 ? "Major" : "Minor",
      standard: "MDR 2017/745", clause: "Annex I",
      requirementSummary: "Each applicable GSPR must be supported by evidence and a compliance statement.",
      whyItMatters: "Unsupported GSPRs are the most common cause of technical documentation deficiencies.",
      currentSituation: `${missingGspr.length} applicable GSPR item(s) lack approved evidence.`,
      recommendedAction: "Link evidence documents and finalize compliance statements for the listed GSPRs.",
      estimatedEffort: 50, quickWin: missingGspr.length <= 2,
      dependencies: [], evidenceNeeded: missingGspr.slice(0, 5).map((g) => `GSPR ${g.gsprNo} evidence`), confidence: 0.88,
    });
  }

  // Risk control & verification
  const uncontrolled = risks.filter((r) => !r.riskControlMeasure || !r.verificationOfControl);
  if (risks.length === 0) {
    gaps.push({
      scopes: all("MDR", "ISO_14971", "ISO_13485"),
      title: "Risk Management File Missing", severity: "Critical",
      standard: "ISO 14971", clause: "Clause 4-7",
      requirementSummary: "A risk management process and file must be established covering hazards, risks and controls.",
      whyItMatters: "ISO 14971 risk management is mandatory for MDR conformity.",
      currentSituation: "No risk items are recorded for this product.",
      recommendedAction: "Create the risk management file with hazards, risk controls and residual risk evaluation.",
      estimatedEffort: 70, quickWin: false,
      dependencies: ["Intended purpose"], evidenceNeeded: ["Risk management plan", "Risk analysis"], confidence: 0.9,
    });
  } else if (uncontrolled.length > 0) {
    gaps.push({
      scopes: all("MDR", "ISO_14971"),
      title: `Risk Controls Incomplete (${uncontrolled.length})`, severity: uncontrolled.length > 2 ? "Major" : "Minor",
      standard: "ISO 14971", clause: "Clause 7-8",
      requirementSummary: "Each hazard requires risk control measures and verification of their effectiveness.",
      whyItMatters: "Residual risk cannot be justified without verified risk controls.",
      currentSituation: `${uncontrolled.length} hazard(s) lack a control measure or verification of control.`,
      recommendedAction: "Define risk control measures and document verification of control for each hazard.",
      estimatedEffort: 55, quickWin: uncontrolled.length <= 2,
      dependencies: [], evidenceNeeded: ["Verification records"], confidence: 0.88,
    });
  }

  // Clinical evaluation — tracked in Clinical module (not TF section)
  const hasRiskModule = risks.length > 0;
  if (!hasRiskModule) {
    gaps.push({
      scopes: all("MDR", "ISO_14971"),
      title: "Risk Management File Missing", severity: "Major",
      standard: "ISO 14971", clause: "Clause 4",
      requirementSummary: "A risk management file must be established per ISO 14971.",
      whyItMatters: "Risk management is mandatory for CE marking under MDR.",
      currentSituation: "No risk items documented in the Risk Management module.",
      recommendedAction: "Complete the Risk Management tab (plan, FMEA, report).",
      estimatedEffort: 60, quickWin: false,
      dependencies: [], evidenceNeeded: ["Risk management file"], confidence: 0.88,
    });
  }

  // PSUR / PMS report reference in technical file
  const psurPms = section("psur-report");
  if (!psurPms || psurPms.status === "MISSING") {
    gaps.push({
      scopes: all("MDR", "ISO_13485"),
      title: "PSUR / PMS Report Reference Missing", severity: "Major",
      standard: "MDR 2017/745", clause: "Art. 86 / Annex III",
      requirementSummary: "PSUR (or PMS report for Class I) must be documented and referenced in the technical file.",
      whyItMatters: "Post-market reporting is a legal obligation; full PMS/PMCF is managed in the PMS module.",
      currentSituation: "PSUR / PMS report section is not established in the technical file.",
      recommendedAction: "Add PSUR/PMS report reference in TF; maintain full PMS plan in the PMS module.",
      estimatedEffort: 40, quickWin: true,
      dependencies: [], evidenceNeeded: ["PSUR or PMS report"], confidence: 0.85,
    });
  }

  // Technical file sections not approved
  const notApproved = sections.filter((s) => s.status !== "APPROVED").length;
  if (notApproved > 0) {
    gaps.push({
      scopes: all("ISO_13485", "MDR"),
      title: `Medical Device File Incomplete (${notApproved})`, severity: notApproved > 5 ? "Major" : "Minor",
      standard: "ISO 13485", clause: "4.2.3",
      requirementSummary: "A Medical Device File must be maintained for each device type/family.",
      whyItMatters: "Incomplete device files are non-conformities in ISO 13485 audits.",
      currentSituation: `${notApproved} technical file section(s) are not approved.`,
      recommendedAction: "Complete, review and approve the outstanding technical file sections.",
      estimatedEffort: 30, quickWin: notApproved <= 2,
      dependencies: [], evidenceNeeded: [], confidence: 0.9,
    });
  }

  // QMS mandatory procedures
  const required: { kw: string; name: string; clause: string }[] = [
    { kw: "document control", name: "Document Control Procedure", clause: "4.2.4" },
    { kw: "record control", name: "Record Control Procedure", clause: "4.2.5" },
    { kw: "capa", name: "CAPA Procedure", clause: "8.5.2 / 8.5.3" },
    { kw: "corrective", name: "CAPA Procedure", clause: "8.5.2 / 8.5.3" },
    { kw: "internal audit", name: "Internal Audit Procedure", clause: "8.2.4" },
    { kw: "management review", name: "Management Review Procedure", clause: "5.6" },
    { kw: "complaint", name: "Complaint Handling Procedure", clause: "8.2.2" },
    { kw: "risk management", name: "Risk Management Procedure", clause: "7.1" },
  ];
  const missingProcs = required.filter((r) => !hasProc(r.kw));
  // dedupe by name
  const seen = new Set<string>();
  const uniqMissing = missingProcs.filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)));
  for (const r of uniqMissing) {
    const critical = ["Document Control Procedure", "CAPA Procedure"].includes(r.name);
    gaps.push({
      scopes: all("ISO_13485", "ISO_9001"),
      title: `${r.name} Missing`, severity: critical ? "Critical" : "Major",
      standard: "ISO 13485", clause: r.clause,
      requirementSummary: `${r.name} is a documented procedure required by the QMS.`,
      whyItMatters: "Missing mandatory procedures are typically major non-conformities.",
      currentSituation: `No QMS document matching "${r.name}" was found.`,
      recommendedAction: `Create and approve the ${r.name} in the QMS Document Center (or use AI Composer).`,
      estimatedEffort: 35, quickWin: true,
      dependencies: [], evidenceNeeded: [r.name], confidence: 0.8,
    });
  }

  // QMS docs not approved
  if (snap.qms.total > 0 && snap.qms.approved < snap.qms.total) {
    gaps.push({
      scopes: all("ISO_13485", "ISO_9001"),
      title: `QMS Documents Not Approved (${snap.qms.total - snap.qms.approved})`, severity: "Minor",
      standard: "ISO 13485", clause: "4.2.4",
      requirementSummary: "QMS documents must be reviewed and approved before use.",
      whyItMatters: "Unapproved controlled documents are document-control non-conformities.",
      currentSituation: `${snap.qms.total - snap.qms.approved} QMS document(s) are not in APPROVED status.`,
      recommendedAction: "Route outstanding QMS documents through review and approval.",
      estimatedEffort: 25, quickWin: true,
      dependencies: [], evidenceNeeded: [], confidence: 0.85,
    });
  }

  // Evidence files
  if (snap.evidence.uploadedFiles === 0) {
    gaps.push({
      scopes: all("MDR", "ISO_13485", "ISO_14971", "ISO_9001"),
      title: "No Objective Evidence Uploaded", severity: "Major",
      standard: "ISO 13485", clause: "4.2.5",
      requirementSummary: "Records provide objective evidence of conformity and effective operation of the QMS.",
      whyItMatters: "Auditors require records/evidence; declarations alone are insufficient.",
      currentSituation: "No evidence files have been uploaded for this scope.",
      recommendedAction: "Upload test reports, validations and records and link them to GSPR/sections/risks.",
      estimatedEffort: 45, quickWin: false,
      dependencies: [], evidenceNeeded: ["Test reports", "Validation reports"], confidence: 0.8,
    });
  }

  // Open CAPA
  if (snap.capa.open > 0) {
    gaps.push({
      scopes: all("ISO_13485", "ISO_9001"),
      title: `Open CAPA (${snap.capa.open})`, severity: snap.capa.overdue > 0 ? "Major" : "Observation",
      standard: "ISO 13485", clause: "8.5.2",
      requirementSummary: "Corrective and preventive actions must be completed and verified for effectiveness.",
      whyItMatters: "Overdue/open CAPAs signal an ineffective improvement loop.",
      currentSituation: `${snap.capa.open} open CAPA(s)${snap.capa.overdue ? `, ${snap.capa.overdue} overdue` : ""}.`,
      recommendedAction: "Close out open CAPAs and verify effectiveness.",
      estimatedEffort: 30, quickWin: snap.capa.open <= 2,
      dependencies: [], evidenceNeeded: ["CAPA effectiveness checks"], confidence: 0.82,
    });
  }

  // Software present without dedicated handling
  if (p?.containsSoftware) {
    const sw = section("software-validation") ?? sections.find((s) => s.key.includes("software"));
    if (!sw || sw.status === "MISSING") {
      gaps.push({
        scopes: all("MDR", "ISO_13485"),
        title: "Software Lifecycle Documentation Missing", severity: "Major",
        standard: "IEC 62304", clause: "Clause 5",
        requirementSummary: "Medical device software requires a documented software development lifecycle.",
        whyItMatters: "Software without IEC 62304 lifecycle evidence is a significant gap.",
        currentSituation: "The device contains software but no software lifecycle documentation was found.",
        recommendedAction: "Establish IEC 62304 software development and verification documentation.",
        estimatedEffort: 70, quickWin: false,
        dependencies: [], evidenceNeeded: ["Software development plan", "Verification records"], confidence: 0.8,
      });
    }
  }

  return gaps;
}

function filterByScope(gaps: GapRule[], scope: ComplianceStandardScope): ComplianceGap[] {
  const filtered = scope === "COMBINED" ? gaps : gaps.filter((g) => g.scopes.includes(scope));
  return filtered
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .map(({ scopes: _scopes, ...rest }) => rest);
}

function impactOf(g: ComplianceGap): number {
  const base: Record<Severity, number> = { Critical: 95, Major: 78, Minor: 55, Observation: 35 };
  return base[g.severity];
}

function buildTopActions(gaps: ComplianceGap[]): TopAction[] {
  return [...gaps]
    .map((g) => ({ title: g.title, impact: impactOf(g), effort: g.estimatedEffort, priority: g.severity }))
    .sort((a, b) => b.impact - a.impact || a.effort - b.effort)
    .slice(0, 5);
}

function buildRoadmap(gaps: ComplianceGap[]): RoadmapWeek[] {
  const critical = gaps.filter((g) => g.severity === "Critical");
  const major = gaps.filter((g) => g.severity === "Major");
  const minor = gaps.filter((g) => g.severity === "Minor");
  const obs = gaps.filter((g) => g.severity === "Observation");
  const quickWins = gaps.filter((g) => g.quickWin);

  const take = (arr: ComplianceGap[], n: number) => arr.slice(0, n).map((g) => g.title);

  return [
    { week: 1, focus: "Stop the bleeding — critical gaps & quick wins", items: [...take(critical, 3), ...take(quickWins, 2)] },
    { week: 2, focus: "Close remaining critical items & evidence", items: [...take(critical.slice(3), 3), ...take(major, 2)] },
    { week: 3, focus: "Major gaps & documentation", items: take(major.slice(2), 4) },
    { week: 4, focus: "Minor gaps, review & verification", items: [...take(minor, 3), ...take(obs, 2)] },
  ].map((w) => ({ ...w, items: w.items.length ? Array.from(new Set(w.items)) : ["No outstanding items for this week."] }));
}

async function buildCitations(companyId: string, scope: ComplianceStandardScope, product: Product | null): Promise<Citation[]> {
  const query = [
    product?.name, product?.intendedPurpose,
    scope === "MDR" ? "MDR technical documentation GSPR clinical evaluation" : "",
    scope === "ISO_13485" ? "quality management system medical device file" : "",
    scope === "ISO_14971" ? "risk management hazard control" : "",
    scope === "ISO_9001" ? "quality management context processes" : "",
    scope === "COMBINED" ? "MDR ISO 13485 risk management quality" : "",
  ].filter(Boolean).join(" ");

  const clauses = await retrieveClauses(companyId, query, 6);
  return clauses.map((c) => ({
    standardCode: c.standardCode,
    clauseNo: c.clauseNo,
    reason: c.title,
    confidence: Math.min(0.95, 0.5 + c.score),
  }));
}

/**
 * Runs a deterministic compliance assessment (always works) and optionally
 * enriches the narrative / scoring with the configured AI provider.
 */
export async function runConsultantAnalysis(
  companyId: string,
  scope: ComplianceStandardScope,
  productId?: string | null,
): Promise<ConsultantResult> {
  const snap = await loadComplianceSnapshot(companyId, productId);
  return analyzeComplianceSnapshot(snap, scope);
}

/**
 * Runs the deterministic compliance assessment + optional AI augmentation against
 * an already-built snapshot. Exposed so the evaluation framework can score the
 * pipeline on synthetic golden cases without persisting them to the database.
 */
export async function analyzeComplianceSnapshot(
  snap: ComplianceSnapshot,
  scope: ComplianceStandardScope,
  providerOverride?: import("@/lib/ai/types").AiProvider | null,
): Promise<ConsultantResult> {
  const companyId = snap.companyId;

  const categoryScores = computeCategories(snap);
  const overallScore = overallFor(scope, categoryScores);
  const gapRules = buildGaps(snap);
  const gaps = filterByScope(gapRules, scope);
  const topActions = buildTopActions(gaps);
  const roadmap = buildRoadmap(gaps);
  const citations = await buildCitations(companyId, scope, snap.product);

  const criticalCount = gaps.filter((g) => g.severity === "Critical").length;
  const summary = snap.product
    ? `${snap.product.name} is ${overallScore}% ready for ${scope.replace("_", " ")}. ${criticalCount} critical gap(s) and ${gaps.length} total gap(s) identified.`
    : `Company-wide ${scope.replace("_", " ")} readiness is ${overallScore}%. ${gaps.length} gap(s) identified.`;

  const base: ConsultantResult = {
    standard: scope,
    productId: snap.product?.id ?? null,
    productName: snap.product?.name ?? null,
    overallScore,
    band: bandOf(overallScore),
    categoryScores,
    gaps,
    topActions,
    roadmap,
    citations,
    confidence: 0.62,
    summary,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };

  return augmentConsultant(base, snap, scope, providerOverride);
}
