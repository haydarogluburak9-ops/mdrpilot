import "server-only";
import { prisma } from "@/lib/db";
import { listProductsWithDossier } from "@/lib/data/queries";
import { QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";
import { computeAuditReadiness } from "@/lib/domain/scoring";

export interface ExecutiveData {
  overallCompliance: number;
  productsTotal: number;
  productsAtRisk: number;
  openCapa: number;
  overdueCapa: number;
  majorFindings: number;
  auditsInProgress: number;
  completedAudits: number;
  evidenceCoverage: number;
  complianceByProduct: { name: string; score: number }[];
  riskDistribution: { name: string; value: number }[];
  capaByStatus: { name: string; value: number }[];
  findingsBySeverity: { name: string; value: number }[];
  auditTrend: { name: string; score: number }[];
  capaTrend: { name: string; value: number }[];
  topRisks: { product: string; hazard: string; level: string }[];
  topMissingDocuments: { title: string; count: number }[];
}

const REQUIRED_PROCS = [
  { kw: "document control", name: "Document Control Procedure" },
  { kw: "record control", name: "Record Control Procedure" },
  { kw: "capa", name: "CAPA Procedure" },
  { kw: "internal audit", name: "Internal Audit Procedure" },
  { kw: "management review", name: "Management Review Procedure" },
  { kw: "complaint", name: "Complaint Handling Procedure" },
  { kw: "risk management", name: "Risk Management Procedure" },
];

function monthKey(d: Date): string {
  return d.toLocaleString("en", { month: "short" });
}

export async function loadExecutiveData(companyId: string): Promise<ExecutiveData> {
  const [products, capas, audits, findings, qmsDocs] = await Promise.all([
    listProductsWithDossier(companyId),
    prisma.cAPA.findMany({ where: { companyId }, select: { status: true, dueDate: true, createdAt: true } }),
    prisma.auditSession.findMany({ where: { companyId }, select: { status: true, score: true, completedAt: true, standard: true } }),
    prisma.auditSimFinding.findMany({ where: { companyId }, select: { severity: true } }),
    prisma.qMSDocument.findMany({
      where: { companyId, deletedAt: null, NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } } },
      select: { title: true },
    }),
  ]);

  const readiness = products.map((p) => ({ name: p.name, score: computeAuditReadiness(p).score }));
  const overallCompliance = readiness.length ? Math.round(readiness.reduce((a, r) => a + r.score, 0) / readiness.length) : 0;
  const productsAtRisk = readiness.filter((r) => r.score < 50).length;

  const now = Date.now();
  const openCapa = capas.filter((c) => c.status !== "CLOSED").length;
  const overdueCapa = capas.filter((c) => c.status !== "CLOSED" && c.dueDate && c.dueDate.getTime() < now).length;

  const majorFindings = findings.filter((f) => f.severity === "MAJOR").length;
  const auditsInProgress = audits.filter((a) => a.status === "IN_PROGRESS").length;
  const completedAudits = audits.filter((a) => a.status === "COMPLETED").length;

  // Evidence coverage across all dossier items.
  let itemsTotal = 0;
  let itemsWithEvidence = 0;
  const evidence = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    include: {
      technicalSections: { select: { _count: { select: { evidenceLinks: true } } } },
      gsprItems: { select: { applicable: true, _count: { select: { evidenceLinks: true } } } },
      riskItems: { select: { _count: { select: { evidenceLinks: true } } } },
    },
  });
  for (const p of evidence) {
    const counts = [
      ...p.technicalSections.map((s) => s._count.evidenceLinks),
      ...p.gsprItems.filter((g) => g.applicable !== "NO").map((g) => g._count.evidenceLinks),
      ...p.riskItems.map((r) => r._count.evidenceLinks),
    ];
    itemsTotal += counts.length;
    itemsWithEvidence += counts.filter((n) => n > 0).length;
  }
  const evidenceCoverage = itemsTotal ? Math.round((itemsWithEvidence / itemsTotal) * 100) : 0;

  // Risk distribution (residual) across all products.
  const riskCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const allRisks: { product: string; hazard: string; level: string; rank: number }[] = [];
  const rank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  for (const p of products) {
    for (const r of p.riskItems ?? []) {
      riskCounts[r.residualRiskLevel] = (riskCounts[r.residualRiskLevel] ?? 0) + 1;
      allRisks.push({ product: p.name, hazard: r.hazard, level: r.residualRiskLevel, rank: rank[r.residualRiskLevel] ?? 0 });
    }
  }
  const topRisks = allRisks.sort((a, b) => b.rank - a.rank).slice(0, 5).map(({ product, hazard, level }) => ({ product, hazard, level }));

  // CAPA by status.
  const capaStatus: Record<string, number> = {};
  for (const c of capas) capaStatus[c.status] = (capaStatus[c.status] ?? 0) + 1;

  // Findings by severity.
  const sevCounts: Record<string, number> = { MAJOR: 0, MINOR: 0, OBSERVATION: 0, POSITIVE: 0 };
  for (const f of findings) sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1;

  // Audit trend (completed sessions over time).
  const auditTrend = audits
    .filter((a) => a.status === "COMPLETED" && a.completedAt && a.score != null)
    .sort((a, b) => (a.completedAt!.getTime() - b.completedAt!.getTime()))
    .slice(-8)
    .map((a) => ({ name: a.completedAt!.toLocaleDateString("en", { month: "short", day: "numeric" }), score: a.score ?? 0 }));

  // CAPA trend by month opened.
  const capaMonth: Record<string, number> = {};
  for (const c of capas) {
    const k = monthKey(c.createdAt);
    capaMonth[k] = (capaMonth[k] ?? 0) + 1;
  }
  const capaTrend = Object.entries(capaMonth).map(([name, value]) => ({ name, value }));

  // Top missing documents.
  const titles = qmsDocs.map((d) => d.title.toLowerCase());
  const missing = REQUIRED_PROCS.filter((r) => !titles.some((t) => t.includes(r.kw)));
  const topMissingDocuments = missing.map((m) => ({ title: m.name, count: 1 }));
  // Add missing technical sections count per product as a roll-up doc.
  let missingSections = 0;
  for (const p of products) missingSections += (p.technicalSections ?? []).filter((s) => s.status !== "APPROVED").length;
  if (missingSections > 0) topMissingDocuments.push({ title: "Technical file sections (not approved)", count: missingSections });

  return {
    overallCompliance,
    productsTotal: products.length,
    productsAtRisk,
    openCapa,
    overdueCapa,
    majorFindings,
    auditsInProgress,
    completedAudits,
    evidenceCoverage,
    complianceByProduct: readiness,
    riskDistribution: Object.entries(riskCounts).map(([name, value]) => ({ name, value })),
    capaByStatus: Object.entries(capaStatus).map(([name, value]) => ({ name, value })),
    findingsBySeverity: Object.entries(sevCounts).map(([name, value]) => ({ name, value })),
    auditTrend,
    capaTrend,
    topRisks,
    topMissingDocuments,
  };
}
