import "server-only";
import type { ExportJob, ExportType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { sterilizationText } from "@/lib/domain/sterilization";
import {
  buildPmsPmcfDocx,
  buildQmsDocx,
  buildTechnicalFileDocx,
} from "./generators/docx-generator";
import { buildIfuDocx } from "./generators/ifu-docx";
import { buildGsprXlsx, buildRiskXlsx } from "./generators/xlsx-generator";
import { buildAuditReadinessPdf, buildLabelPdf } from "./generators/pdf-generator";
import { buildDhfDocxBuffer, buildDhfPdfBuffer } from "./generators/dhf-export";
import { buildZip, type ZipEntry } from "./generators/zip-generator";
import { buildManifest, manifestBuffer } from "./manifest";
import { coerceLanguage, langFileTag, PRIMARY_LANGUAGE, type ExportLanguage } from "./i18n";
import { loadCompanyLogo } from "./logo";
import { EXPORT_DEFS, FORMAT_EXT, type ExportContext, type ProductExportData } from "./types";
import { sortByGsprNo } from "@/lib/domain/gspr-sort";
import {
  formatStandardReference,
  formatStandardsInText,
} from "@/lib/domain/standards-catalog";
import { QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";

const QMS_PACKAGE_DOCS: { file: string; title: string; clauseRefs: string }[] = [
  { file: "document-control-procedure.docx", title: "Document Control Procedure", clauseRefs: "4.2.4" },
  { file: "capa-procedure.docx", title: "CAPA Procedure", clauseRefs: "8.5.2 / 8.5.3" },
  { file: "internal-audit-procedure.docx", title: "Internal Audit Procedure", clauseRefs: "8.2.4" },
  { file: "management-review-procedure.docx", title: "Management Review Procedure", clauseRefs: "5.6" },
];

function slug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "export";
}

interface ProductWithEvidence {
  data: ProductExportData;
  linkedEvidence: import("./types").LinkedEvidence[];
}

async function loadProduct(companyId: string, productId: string): Promise<ProductExportData> {
  return (await loadProductWithEvidence(companyId, productId)).data;
}

async function loadProductWithEvidence(companyId: string, productId: string): Promise<ProductWithEvidence> {
  const fileSel = { fileName: true, originalName: true, documentKind: true, analysisSummary: true, checksumSha256: true } as const;
  const p = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      technicalSections: { orderBy: { order: "asc" }, include: { evidenceLinks: { include: { uploadedFile: { select: fileSel } } } } },
      gsprItems: { orderBy: { gsprNo: "asc" }, include: { evidenceLinks: { include: { uploadedFile: { select: fileSel } } } } },
      riskItems: { orderBy: { createdAt: "asc" }, include: { evidenceLinks: { include: { uploadedFile: { select: fileSel } } } } },
      riskManagementFile: { select: { fmeaBenefitRiskAnalysis: true } },
    },
  });
  if (!p || p.companyId !== companyId) throw new NotFoundError();

  const linkedEvidence: import("./types").LinkedEvidence[] = [];
  const toRef = (uf: { fileName: string; documentKind: string }) => ({ fileName: uf.fileName, documentKind: uf.documentKind });

  const data: ProductExportData = {
    id: p.id,
    name: p.name,
    brand: p.brand,
    model: p.model,
    variantsJson: p.variantsJson,
    deviceClass: p.deviceClass,
    basicUdiDi: p.basicUdiDi,
    udiDi: p.udiDi,
    intendedPurpose: p.intendedPurpose,
    indications: p.indications,
    contraindications: p.contraindications,
    isSterile: p.isSterile,
    isReusable: p.isReusable,
    sterilization: sterilizationText({ isSterile: p.isSterile, sterilization: p.sterilization, variantsJson: p.variantsJson }) || p.sterilization,
    isInvasive: p.isInvasive,
    hasMeasuringFn: p.hasMeasuringFn,
    containsSoftware: p.containsSoftware,
    materials: p.materials,
    packagingType: p.packagingType,
    shelfLife: p.shelfLife,
    userProfile: p.userProfile,
    patientPopulation: p.patientPopulation,
    bodyContactDuration: p.bodyContactDuration,
    appliedStandards: p.appliedStandards,
    complianceScore: p.complianceScore,
    technicalSections: p.technicalSections.map((s) => {
      for (const l of s.evidenceLinks) {
        linkedEvidence.push({ ...l.uploadedFile, target: "TECHNICAL_FILE", targetLabel: s.title });
      }
      return {
        key: s.key, title: s.title,
        annexRef: formatStandardsInText(s.annexRef) ?? s.annexRef,
        status: s.status, ownerName: s.ownerName,
        evidenceFiles: s.evidenceLinks.map((l) => toRef(l.uploadedFile)),
      };
    }),
    gsprItems: sortByGsprNo(
      p.gsprItems.map((g) => {
        for (const l of g.evidenceLinks) {
          linkedEvidence.push({ ...l.uploadedFile, target: "GSPR", targetLabel: `GSPR ${g.gsprNo}` });
        }
        return {
          gsprNo: g.gsprNo, requirementSummary: g.requirementSummary, applicable: g.applicable,
          justification: g.justification,
          evidenceDocument: formatStandardsInText(g.evidenceDocument) ?? g.evidenceDocument,
          standardReference: formatStandardReference(g.standardReference) ?? g.standardReference,
          complianceStatement: g.complianceStatement, status: g.status, aiGapComment: g.aiGapComment,
          evidenceFiles: g.evidenceLinks.map((l) => toRef(l.uploadedFile)),
        };
      }),
    ),
    riskItems: p.riskItems.map((r) => {
      for (const l of r.evidenceLinks) {
        linkedEvidence.push({ ...l.uploadedFile, target: "RISK", targetLabel: r.hazard });
      }
      return {
        hazard: r.hazard, sequenceOfEvents: r.sequenceOfEvents, hazardousSituation: r.hazardousSituation, harm: r.harm,
        initialSeverity: r.initialSeverity, initialProbability: r.initialProbability, initialRiskLevel: r.initialRiskLevel,
        riskControlMeasure: r.riskControlMeasure, residualSeverity: r.residualSeverity, residualProbability: r.residualProbability,
        residualRiskLevel: r.residualRiskLevel, benefitRiskJustification: r.benefitRiskJustification,
        verificationOfControl: r.verificationOfControl,
        evidenceFiles: r.evidenceLinks.map((l) => toRef(l.uploadedFile)),
      };
    }),
    fmeaBenefitRiskAnalysis: p.riskManagementFile?.fmeaBenefitRiskAnalysis ?? null,
  };

  return { data, linkedEvidence };
}

async function buildContext(
  companyId: string,
  productId: string | undefined,
  generatedBy: string,
  language: ExportLanguage = PRIMARY_LANGUAGE,
  exportOptions?: import("./types").ExportOptions,
): Promise<ExportContext> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError();

  const logo = await loadCompanyLogo(companyId);

  const productWithEvidence = productId ? await loadProductWithEvidence(companyId, productId) : null;
  const product = productWithEvidence?.data ?? null;

  const [qmsDocs, capas] = await Promise.all([
    prisma.qMSDocument.findMany({
      where: { companyId, deletedAt: null, NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } } },
      orderBy: { code: "asc" },
    }),
    productId
      ? prisma.cAPA.findMany({ where: { companyId, productId }, orderBy: { createdAt: "desc" } })
      : prisma.cAPA.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    company: {
      id: company.id,
      name: company.name,
      legalName: company.legalName,
      address: company.address,
      country: company.country,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      srnNumber: company.srnNumber,
      notifiedBody: company.notifiedBody,
      notifiedBodyNumber: company.notifiedBodyNumber,
      logo,
    },
    product,
    qmsDocs: qmsDocs.map((d) => ({
      code: d.code, title: d.title, standard: d.standard, clauseRefs: d.clauseRefs, status: d.status, version: d.version,
    })),
    capas: capas.map((c) => ({ title: c.title, status: c.status, dueDate: c.dueDate ? c.dueDate.toISOString() : null })),
    linkedEvidence: productWithEvidence?.linkedEvidence ?? [],
    generatedAt: new Date(),
    generatedBy,
    language,
    exportOptions,
  };
}

async function generate(type: ExportType, ctx: ExportContext): Promise<Buffer> {
  switch (type) {
    case "TECHNICAL_FILE_DOCX":
      return buildTechnicalFileDocx(ctx);
    case "GSPR_XLSX":
      return buildGsprXlsx(ctx);
    case "RISK_XLSX":
      return buildRiskXlsx(ctx);
    case "IFU_DOCX":
      return buildIfuDocx(ctx);
    case "PMS_PMCF_DOCX":
      return buildPmsPmcfDocx(ctx);
    case "LABEL_PDF":
      return buildLabelPdf(ctx);
    case "AUDIT_READINESS_PDF":
      return buildAuditReadinessPdf(ctx);
    case "DHF_DOCX": {
      if (!ctx.product?.id) throw new Error("Product required");
      return buildDhfDocxBuffer({
        companyId: ctx.company.id,
        productId: ctx.product.id,
        exportLang: ctx.language,
        generatedBy: ctx.generatedBy,
      });
    }
    case "DHF_PDF": {
      if (!ctx.product?.id) throw new Error("Product required");
      return buildDhfPdfBuffer({
        companyId: ctx.company.id,
        productId: ctx.product.id,
        exportLang: ctx.language,
        generatedBy: ctx.generatedBy,
      });
    }

    case "FULL_MDR_TECHNICAL_FILE_ZIP": {
      const [tf, gspr, risk, ifu, audit] = await Promise.all([
        buildTechnicalFileDocx(ctx),
        buildGsprXlsx(ctx),
        buildRiskXlsx(ctx),
        buildIfuDocx(ctx),
        buildAuditReadinessPdf(ctx),
      ]);
      const contents = ["technical-file.docx", "gspr-checklist.xlsx", "risk-management.xlsx", "ifu.docx", "audit-readiness.pdf"];
      const entries: ZipEntry[] = [
        { name: "technical-file.docx", buffer: tf },
        { name: "gspr-checklist.xlsx", buffer: gspr },
        { name: "risk-management.xlsx", buffer: risk },
        { name: "ifu.docx", buffer: ifu },
        { name: "audit-readiness.pdf", buffer: audit },
        { name: "manifest.json", buffer: manifestBuffer(buildManifest(ctx, contents)) },
      ];
      return buildZip(entries);
    }

    case "PRODUCT_DOSSIER_ZIP": {
      const dhfInput = {
        companyId: ctx.company.id,
        productId: ctx.product!.id,
        exportLang: ctx.language,
        generatedBy: ctx.generatedBy,
      };
      const [tf, gspr, risk, ifu, pms, label, audit, dhfDocx, dhfPdf] = await Promise.all([
        buildTechnicalFileDocx(ctx),
        buildGsprXlsx(ctx),
        buildRiskXlsx(ctx),
        buildIfuDocx(ctx),
        buildPmsPmcfDocx(ctx),
        buildLabelPdf(ctx),
        buildAuditReadinessPdf(ctx),
        buildDhfDocxBuffer(dhfInput),
        buildDhfPdfBuffer(dhfInput),
      ]);
      const contents = [
        "technical-file.docx", "gspr-checklist.xlsx", "risk-management.xlsx",
        "ifu.docx", "pms-pmcf.docx", "label.pdf", "audit-readiness.pdf",
        "design-history-file.docx", "design-history-file.pdf",
      ];
      const entries: ZipEntry[] = [
        { name: "technical-file.docx", buffer: tf },
        { name: "gspr-checklist.xlsx", buffer: gspr },
        { name: "risk-management.xlsx", buffer: risk },
        { name: "ifu.docx", buffer: ifu },
        { name: "pms-pmcf.docx", buffer: pms },
        { name: "label.pdf", buffer: label },
        { name: "audit-readiness.pdf", buffer: audit },
        { name: "design-history-file.docx", buffer: dhfDocx },
        { name: "design-history-file.pdf", buffer: dhfPdf },
        { name: "manifest.json", buffer: manifestBuffer(buildManifest(ctx, contents)) },
      ];
      return buildZip(entries);
    }

    case "QMS_PACKAGE_ZIP": {
      const docs = await Promise.all(
        QMS_PACKAGE_DOCS.map((d) => buildQmsDocx(ctx, { title: d.title, standard: "ISO 13485", clauseRefs: d.clauseRefs })),
      );
      const entries: ZipEntry[] = QMS_PACKAGE_DOCS.map((d, i) => ({ name: d.file, buffer: docs[i] }));
      entries.push({ name: "manifest.json", buffer: manifestBuffer(buildManifest(ctx, QMS_PACKAGE_DOCS.map((d) => d.file))) });
      return buildZip(entries);
    }

    default:
      throw new Error(`Unsupported export type: ${type}`);
  }
}

export interface CreateExportParams {
  companyId: string;
  productId?: string;
  type: ExportType;
  userId: string;
  ip?: string | null;
  /** Output language (mode B). Defaults to the primary language. */
  language?: ExportLanguage;
  exportOptions?: import("./types").ExportOptions;
}

/** Creates an ExportJob, generates the artifact, stores it, and finalizes the job. */
export async function createExport(params: CreateExportParams): Promise<ExportJob> {
  const def = EXPORT_DEFS[params.type];
  if (!def) throw new NotFoundError();
  if (def.requiresProduct && !params.productId) {
    throw new Error("This export type requires a product");
  }

  // Validate product ownership up-front (throws NotFound on cross-company).
  if (params.productId) await loadProduct(params.companyId, params.productId);

  const job = await prisma.exportJob.create({
    data: {
      companyId: params.companyId,
      productId: params.productId ?? null,
      createdById: params.userId,
      type: params.type,
      format: def.format,
      status: "PROCESSING",
    },
  });

  try {
    const language = coerceLanguage(params.language);
    const ctx = await buildContext(params.companyId, params.productId, params.userId, language, params.exportOptions);
    const buffer = await generate(params.type, ctx);

    const ext = FORMAT_EXT[def.format];
    const base = slug(ctx.product?.name ?? ctx.company.name);
    const displayName = `${base}-${params.type.toLowerCase()}-${langFileTag(language)}-${ctx.generatedAt.toISOString().slice(0, 10)}.${ext}`;
    const key = `${params.companyId}/${job.id}.${ext}`;

    const saved = await getStorage().save(key, buffer);

    const done = await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", fileKey: key, fileName: displayName, sizeBytes: saved.size },
    });

    await writeAuditLog({
      action: "export.create",
      userId: params.userId,
      companyId: params.companyId,
      entity: "ExportJob",
      entityId: job.id,
      metadata: { type: params.type, size: saved.size, language },
      ip: params.ip,
    });

    return done;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export generation failed";
    const failed = await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message.slice(0, 500) },
    });
    await writeAuditLog({
      action: "export.failed",
      userId: params.userId,
      companyId: params.companyId,
      entity: "ExportJob",
      entityId: job.id,
      metadata: { type: params.type, error: message.slice(0, 200) },
      ip: params.ip,
    });
    return failed;
  }
}

export async function listExports(companyId: string) {
  const rows = await prisma.exportJob.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const productIds = Array.from(new Set(rows.map((r) => r.productId).filter(Boolean))) as string[];
  const userIds = Array.from(new Set(rows.map((r) => r.createdById).filter(Boolean))) as string[];
  const [products, users] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p.name]));
  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    format: r.format,
    status: r.status,
    fileName: r.fileName,
    sizeBytes: r.sizeBytes,
    errorMessage: r.errorMessage,
    productName: r.productId ? productMap.get(r.productId) ?? null : null,
    createdBy: r.createdById ? userMap.get(r.createdById) ?? null : null,
    createdAt: r.createdAt.toISOString(),
  }));
}
