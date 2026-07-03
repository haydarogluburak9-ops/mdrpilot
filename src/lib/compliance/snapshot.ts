import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { getProductForCompany } from "@/lib/data/queries";
import { QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";
import type { Product } from "@/lib/domain/types";

export interface ComplianceSnapshot {
  companyId: string;
  companyName: string;
  product: Product | null;
  evidence: {
    itemsTotal: number;
    itemsWithEvidence: number;
    uploadedFiles: number;
    analyzedFiles: number;
  };
  composer: { total: number; approved: number; avgConfidence: number };
  qms: { total: number; approved: number; titles: string[] };
  capa: { total: number; open: number; overdue: number };
  auditFindings: { total: number; open: number };
  citations: number;
}

/**
 * Loads a company-isolated, cross-module snapshot for the compliance engine.
 * If a productId is provided it is validated against the company (404 on mismatch).
 */
export async function loadComplianceSnapshot(
  companyId: string,
  productId?: string | null,
): Promise<ComplianceSnapshot> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) throw new NotFoundError();

  const product = productId ? await getProductForCompany(companyId, productId) : null;
  if (productId && !product) throw new NotFoundError();

  // Evidence coverage across dossier items (with at least one linked file).
  let itemsTotal = 0;
  let itemsWithEvidence = 0;
  if (product) {
    const p = await prisma.product.findFirst({
      where: { id: product.id, companyId },
      include: {
        technicalSections: { include: { evidenceLinks: { select: { id: true } } } },
        gsprItems: { include: { evidenceLinks: { select: { id: true } } } },
        riskItems: { include: { evidenceLinks: { select: { id: true } } } },
      },
    });
    if (p) {
      const all = [
        ...p.technicalSections.filter((s) => s.applicable !== false).map((s) => s.evidenceLinks.length),
        ...p.gsprItems.filter((g) => g.applicable !== "NO").map((g) => g.evidenceLinks.length),
        ...p.riskItems.map((r) => r.evidenceLinks.length),
      ];
      itemsTotal = all.length;
      itemsWithEvidence = all.filter((n) => n > 0).length;
    }
  }

  const fileWhere = productId ? { companyId, productId, deletedAt: null } : { companyId, deletedAt: null };
  const composerWhere = productId ? { companyId, productId } : { companyId };
  const capaWhere = productId ? { companyId, productId } : { companyId };
  const findingWhere = productId ? { productId } : { product: { companyId } };

  const [files, composerDocs, qmsDocs, capas, findings, citations] = await Promise.all([
    prisma.uploadedFile.findMany({ where: fileWhere, select: { analysisStatus: true } }),
    prisma.composerDocument.findMany({ where: composerWhere, select: { status: true, aiConfidence: true } }),
    prisma.qMSDocument.findMany({
      where: { companyId, deletedAt: null, NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } } },
      select: { title: true, status: true },
    }),
    prisma.cAPA.findMany({ where: capaWhere, select: { status: true, dueDate: true } }),
    prisma.auditFinding.findMany({ where: findingWhere, select: { status: true } }),
    prisma.aICitation.count({ where: { companyId } }),
  ]);

  const now = Date.now();
  const composerApproved = composerDocs.filter((d) => d.status === "APPROVED").length;
  const avgConfidence = composerDocs.length
    ? composerDocs.reduce((a, d) => a + d.aiConfidence, 0) / composerDocs.length
    : 0;

  return {
    companyId,
    companyName: company.name,
    product,
    evidence: {
      itemsTotal,
      itemsWithEvidence,
      uploadedFiles: files.length,
      analyzedFiles: files.filter((f) => f.analysisStatus === "COMPLETED").length,
    },
    composer: { total: composerDocs.length, approved: composerApproved, avgConfidence },
    qms: {
      total: qmsDocs.length,
      approved: qmsDocs.filter((d) => d.status === "APPROVED").length,
      titles: qmsDocs.map((d) => d.title),
    },
    capa: {
      total: capas.length,
      open: capas.filter((c) => c.status !== "CLOSED").length,
      overdue: capas.filter((c) => c.status !== "CLOSED" && c.dueDate && c.dueDate.getTime() < now).length,
    },
    auditFindings: {
      total: findings.length,
      open: findings.filter((f) => f.status !== "APPROVED").length,
    },
    citations,
  };
}
