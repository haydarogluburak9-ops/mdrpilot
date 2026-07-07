import "server-only";
import type { Product } from "@/lib/domain/types";
import { hasRealGsprEvidence } from "@/lib/domain/gspr-row-status";

export type WorkflowStepStatus = "done" | "in_progress" | "pending";

export interface DossierWorkflowStep {
  id: string;
  order: number;
  status: WorkflowStepStatus;
  href: string;
  /** i18n key for title */
  titleKey: string;
  /** i18n key for description */
  descKey: string;
  /** optional i18n key explaining what's still missing */
  hintKey?: string;
}

export interface DossierWorkflowInput {
  companyCountry?: string | null;
  srnNumber?: string | null;
  notifiedBody?: string | null;
  qmsDocsWithContent: number;
  qmsDocsApproved: number;
  uploadedFiles: number;
  composerQmExists: boolean;
  products: Product[];
}

function primaryProduct(products: Product[]): Product | null {
  return products[0] ?? null;
}

function gsprEvidenceRatio(product: Product): number {
  const applicable = (product.gsprItems ?? []).filter((g) => g.applicable !== "NO");
  if (applicable.length === 0) return 0;
  const ok = applicable.filter(
    (g) =>
      g.status === "APPROVED" ||
      hasRealGsprEvidence(0, g.evidenceDocumentRaw ?? g.evidenceDocument, g.evidenceManual),
  ).length;
  return ok / applicable.length;
}

function tfProgress(product: Product): { approved: number; total: number; started: number } {
  const sections = product.technicalSections ?? [];
  const total = sections.length;
  const approved = sections.filter((s) => s.status === "APPROVED").length;
  const started = sections.filter((s) => s.status !== "MISSING").length;
  return { approved, total, started };
}

export function computeDossierWorkflow(input: DossierWorkflowInput): DossierWorkflowStep[] {
  const product = primaryProduct(input.products);
  const productHref = product ? `/products/${product.id}` : "/products";

  const companyDone =
    !!input.companyCountry?.trim() && (!!input.srnNumber?.trim() || !!input.notifiedBody?.trim());
  const companyStarted = !!input.companyCountry?.trim();

  const hasProduct = input.products.length > 0;
  const primary = primaryProduct(input.products);
  const desc = product?.technicalSections?.find((s) => s.key === "device-description");
  const descDone = !!desc && desc.status !== "MISSING" && !!desc.content?.trim();
  const descStarted = !!desc && desc.status !== "MISSING";

  const qmsBaselineDone =
    input.qmsDocsApproved >= 3 || (input.qmsDocsWithContent >= 5 && input.composerQmExists);
  const qmsBaselineStarted = input.qmsDocsWithContent > 0 || input.composerQmExists;

  const tf = product ? tfProgress(product) : { approved: 0, total: 0, started: 0 };
  const tfDone = tf.total > 0 && tf.approved >= Math.ceil(tf.total * 0.3);
  const tfStarted = tf.started > 0;

  const riskCount = product?.riskItems?.length ?? 0;
  const riskDone = riskCount >= 3;
  const riskStarted = riskCount > 0;

  const gsprRatio = product ? gsprEvidenceRatio(product) : 0;
  const gsprDone = gsprRatio >= 0.5;
  const gsprStarted = gsprRatio > 0 || (product?.gsprItems?.some((g) => g.applicable !== "NO" && g.justification?.trim()) ?? false);

  const filesDone = input.uploadedFiles >= 1;
  const filesStarted = input.uploadedFiles > 0;

  const clinical = product?.technicalSections?.find((s) => s.key === "clinical-evaluation");
  const clinicalDone = !!clinical && clinical.status !== "MISSING";
  const clinicalStarted = !!clinical && clinical.status === "DRAFT";

  const pms = product?.technicalSections?.find((s) => s.key === "pms-plan");
  const pmsDone = !!pms && pms.status !== "MISSING";
  const pmsStarted = !!pms && pms.status === "DRAFT";

  const approvedTotal =
    (product?.technicalSections?.filter((s) => s.status === "APPROVED").length ?? 0) +
    (product?.gsprItems?.filter((g) => g.status === "APPROVED").length ?? 0) +
    input.qmsDocsApproved;
  const approvalsDone = approvedTotal >= 5;
  const approvalsStarted = approvedTotal > 0;

  const auditDone =
    tfDone && gsprDone && riskDone && qmsBaselineDone && filesDone;
  const auditStarted = tfStarted || gsprStarted || riskStarted;

  const steps: Omit<DossierWorkflowStep, "order">[] = [
    {
      id: "company-profile",
      status: companyDone ? "done" : companyStarted ? "in_progress" : "pending",
      href: "/settings",
      titleKey: "workflow.step.company.title",
      descKey: "workflow.step.company.desc",
      hintKey: companyDone ? undefined : "workflow.step.company.hint",
    },
    {
      id: "create-product",
      status: hasProduct ? "done" : "pending",
      href: hasProduct && primary ? `/products/${primary.id}?tab=overview` : "/products/new?welcome=1",
      titleKey: "workflow.step.product.title",
      descKey: "workflow.step.product.desc",
      hintKey: hasProduct ? undefined : "workflow.step.product.hint",
    },
    {
      id: "device-description",
      status: descDone ? "done" : descStarted ? "in_progress" : "pending",
      href: productHref,
      titleKey: "workflow.step.deviceDesc.title",
      descKey: "workflow.step.deviceDesc.desc",
      hintKey: descDone ? undefined : "workflow.step.deviceDesc.hint",
    },
    {
      id: "qms-baseline",
      status: qmsBaselineDone ? "done" : qmsBaselineStarted ? "in_progress" : "pending",
      href: "/qms",
      titleKey: "workflow.step.qms.title",
      descKey: "workflow.step.qms.desc",
      hintKey: qmsBaselineDone ? undefined : "workflow.step.qms.hint",
    },
    {
      id: "technical-file",
      status: tfDone ? "done" : tfStarted ? "in_progress" : "pending",
      href: "/technical-file",
      titleKey: "workflow.step.techFile.title",
      descKey: "workflow.step.techFile.desc",
      hintKey: tfDone ? undefined : "workflow.step.techFile.hint",
    },
    {
      id: "risk-file",
      status: riskDone ? "done" : riskStarted ? "in_progress" : "pending",
      href: "/risk",
      titleKey: "workflow.step.risk.title",
      descKey: "workflow.step.risk.desc",
      hintKey: riskDone ? undefined : "workflow.step.risk.hint",
    },
    {
      id: "gspr-evidence",
      status: gsprDone ? "done" : gsprStarted ? "in_progress" : "pending",
      href: "/gspr",
      titleKey: "workflow.step.gspr.title",
      descKey: "workflow.step.gspr.desc",
      hintKey: gsprDone ? undefined : "workflow.step.gspr.hint",
    },
    {
      id: "upload-files",
      status: filesDone ? "done" : filesStarted ? "in_progress" : "pending",
      href: "/files",
      titleKey: "workflow.step.files.title",
      descKey: "workflow.step.files.desc",
      hintKey: filesDone ? undefined : "workflow.step.files.hint",
    },
    {
      id: "clinical",
      status: clinicalDone ? "done" : clinicalStarted ? "in_progress" : "pending",
      href: "/clinical",
      titleKey: "workflow.step.clinical.title",
      descKey: "workflow.step.clinical.desc",
      hintKey: clinicalDone ? undefined : "workflow.step.clinical.hint",
    },
    {
      id: "pms",
      status: pmsDone ? "done" : pmsStarted ? "in_progress" : "pending",
      href: "/pms",
      titleKey: "workflow.step.pms.title",
      descKey: "workflow.step.pms.desc",
      hintKey: pmsDone ? undefined : "workflow.step.pms.hint",
    },
    {
      id: "approvals",
      status: approvalsDone ? "done" : approvalsStarted ? "in_progress" : "pending",
      href: "/document-control",
      titleKey: "workflow.step.approvals.title",
      descKey: "workflow.step.approvals.desc",
      hintKey: approvalsDone ? undefined : "workflow.step.approvals.hint",
    },
    {
      id: "audit-readiness",
      status: auditDone ? "done" : auditStarted ? "in_progress" : "pending",
      href: "/audit",
      titleKey: "workflow.step.audit.title",
      descKey: "workflow.step.audit.desc",
      hintKey: auditDone ? undefined : "workflow.step.audit.hint",
    },
  ];

  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}

export async function loadDossierWorkflowInput(companyId: string, products: Product[]): Promise<DossierWorkflowInput> {
  const { prisma } = await import("@/lib/db");
  const { QMS_REGISTER_EXCLUDED_CODES } = await import("@/lib/domain/constants");

  const [company, qmsDocs, fileCount, composerQm] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { country: true, srnNumber: true, notifiedBody: true },
    }),
    prisma.qMSDocument.findMany({
      where: { companyId, deletedAt: null, NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } } },
      select: { status: true, content: true },
    }),
    prisma.uploadedFile.count({ where: { companyId, deletedAt: null } }),
    prisma.composerDocument.findFirst({
      where: { companyId, type: "ISO13485_QUALITY_MANUAL" },
      select: { id: true },
    }),
  ]);

  const withContent = qmsDocs.filter((d) => (d.content?.trim().length ?? 0) > 80);

  return {
    companyCountry: company?.country,
    srnNumber: company?.srnNumber,
    notifiedBody: company?.notifiedBody,
    qmsDocsWithContent: withContent.length,
    qmsDocsApproved: withContent.filter((d) => d.status === "APPROVED").length,
    uploadedFiles: fileCount,
    composerQmExists: !!composerQm,
    products,
  };
}

/** Per-product dossier steps for the product detail overview tab. */
export function computeProductWorkflowSteps(product: Product): DossierWorkflowStep[] {
  const base = `/products/${product.id}`;
  const desc = product.technicalSections?.find((s) => s.key === "device-description");
  const descDone = !!desc && desc.status !== "MISSING" && !!desc.content?.trim();
  const descStarted = !!desc && desc.status !== "MISSING";

  const tf = product.technicalSections ?? [];
  const tfApproved = tf.filter((s) => s.status === "APPROVED").length;
  const tfDone = tf.length > 0 && tfApproved >= Math.ceil(tf.length * 0.2);
  const tfStarted = tf.some((s) => s.status !== "MISSING");

  const riskCount = product.riskItems?.length ?? 0;
  const riskDone = riskCount >= 3;
  const riskStarted = riskCount > 0;

  const applicable = (product.gsprItems ?? []).filter((g) => g.applicable !== "NO");
  const gsprOk = applicable.filter(
    (g) =>
      g.status === "APPROVED" ||
      hasRealGsprEvidence(0, g.evidenceDocumentRaw ?? g.evidenceDocument, g.evidenceManual),
  ).length;
  const gsprRatio = applicable.length ? gsprOk / applicable.length : 0;
  const gsprDone = gsprRatio >= 0.5;
  const gsprStarted = gsprRatio > 0;

  const clinical = tf.find((s) => s.key === "clinical-evaluation");
  const clinicalDone = !!clinical && clinical.status !== "MISSING";
  const clinicalStarted = !!clinical && clinical.status === "DRAFT";

  const pms = tf.find((s) => s.key === "pms-plan");
  const pmsDone = !!pms && pms.status !== "MISSING";
  const pmsStarted = !!pms && pms.status === "DRAFT";

  const udiDone = !!product.basicUdiDi?.trim() && !!product.udiDi?.trim();
  const udiStarted = !!product.basicUdiDi?.trim() || !!product.udiDi?.trim();

  const steps: Omit<DossierWorkflowStep, "order">[] = [
    {
      id: "product-profile",
      status: product.intendedPurpose?.trim() ? "done" : "pending",
      href: `${base}/edit`,
      titleKey: "workflow.product.profile.title",
      descKey: "workflow.product.profile.desc",
      hintKey: product.intendedPurpose?.trim() ? undefined : "workflow.product.profile.hint",
    },
    {
      id: "device-description",
      status: descDone ? "done" : descStarted ? "in_progress" : "pending",
      href: `${base}?tab=technical`,
      titleKey: "workflow.step.deviceDesc.title",
      descKey: "workflow.step.deviceDesc.desc",
      hintKey: descDone ? undefined : "workflow.step.deviceDesc.hint",
    },
    {
      id: "risk-file",
      status: riskDone ? "done" : riskStarted ? "in_progress" : "pending",
      href: `${base}?tab=risk`,
      titleKey: "workflow.step.risk.title",
      descKey: "workflow.step.risk.desc",
      hintKey: riskDone ? undefined : "workflow.step.risk.hint",
    },
    {
      id: "gspr-evidence",
      status: gsprDone ? "done" : gsprStarted ? "in_progress" : "pending",
      href: `${base}?tab=gspr`,
      titleKey: "workflow.step.gspr.title",
      descKey: "workflow.step.gspr.desc",
      hintKey: gsprDone ? undefined : "workflow.step.gspr.hint",
    },
    {
      id: "technical-file",
      status: tfDone ? "done" : tfStarted ? "in_progress" : "pending",
      href: `${base}?tab=technical`,
      titleKey: "workflow.step.techFile.title",
      descKey: "workflow.step.techFile.desc",
      hintKey: tfDone ? undefined : "workflow.step.techFile.hint",
    },
    {
      id: "clinical",
      status: clinicalDone ? "done" : clinicalStarted ? "in_progress" : "pending",
      href: `${base}?tab=clinical`,
      titleKey: "workflow.step.clinical.title",
      descKey: "workflow.step.clinical.desc",
      hintKey: clinicalDone ? undefined : "workflow.step.clinical.hint",
    },
    {
      id: "pms",
      status: pmsDone ? "done" : pmsStarted ? "in_progress" : "pending",
      href: `${base}?tab=pms`,
      titleKey: "workflow.step.pms.title",
      descKey: "workflow.step.pms.desc",
      hintKey: pmsDone ? undefined : "workflow.step.pms.hint",
    },
    {
      id: "udi",
      status: udiDone ? "done" : udiStarted ? "in_progress" : "pending",
      href: `${base}?tab=udi`,
      titleKey: "workflow.product.udi.title",
      descKey: "workflow.product.udi.desc",
      hintKey: udiDone ? undefined : "workflow.product.udi.hint",
    },
  ];

  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}
