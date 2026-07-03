import "server-only";
import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import { DEFAULT_QMS_REVISION } from "@/lib/qms/revision";
import { generateQmsDocument } from "@/lib/qms/generate-document";
import { childLayerAiGuidance } from "@/lib/qms/child-layer-guidance";
import { inferQmsLayerFromCode, type QmsDocumentLayer } from "@/lib/qms/kys-structure";
import { loadQmsWizardAnswers } from "@/lib/qms/wizard-context";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import {
  docLinkedToProcedure,
  ensureProcedurePack,
  getProcedurePackChildHints,
  procedureUsesProductContext,
} from "@/lib/qms/procedure-packs";
import { buildCompanyProductsContext } from "@/lib/qms/product-context";
import { childContentNeedsRegeneration } from "@/lib/qms/child-content-quality";
import type { Lang } from "@/lib/i18n/locales";
import { binaryContentLang } from "@/lib/i18n/locales";

const LAYER_CODE_PREFIX: Partial<Record<QmsDocumentLayer, string>> = {
  INSTRUCTION: "WI",
  FORM: "FORM",
  DIAGRAM: "DIA",
  PLAN: "PLAN",
  LIST: "LIST",
  SPECIFICATION: "SPEC",
  JOB_DESCRIPTION: "JD",
  ASSIGNMENT: "ASG",
  RECORD: "REC",
  OTHER: "DOC",
};

function sopSuffix(parentCode: string): string {
  const c = parentCode.trim().toUpperCase();
  const m = c.match(/^SOP-(.+)$/);
  return m ? m[1] : c.replace(/^SOP-/, "");
}

/** Next available code under parent, e.g. WI-PC-02 for SOP-PC. */
export function suggestNextChildCode(
  parentProcedureCode: string,
  layer: QmsDocumentLayer,
  existingCodes: string[],
): string {
  const prefix = LAYER_CODE_PREFIX[layer] ?? "DOC";
  const suffix = sopSuffix(parentProcedureCode);
  const pattern = new RegExp(`^${prefix}-${suffix}-(\\d+)$`, "i");
  let max = 0;
  for (const code of existingCodes) {
    const m = code.trim().toUpperCase().match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = String(max + 1).padStart(2, "0");
  return `${prefix}-${suffix}-${next}`;
}

export async function buildProcedureChildAiContext(params: {
  companyId: string;
  locale: Lang;
  childDoc: {
    code: string | null;
    title: string;
    layer: string;
    clauseRefs: string | null;
    parentProcedureCode: string | null;
  };
  userContext?: string;
  wizardAnswers?: Record<string, unknown>;
}): Promise<string> {
  const rulesLocale = binaryContentLang(params.locale);
  const { buildQmsAiContext } = await import("@/lib/qms/wizard-context");
  const answers = params.wizardAnswers ?? await loadQmsWizardAnswers(params.companyId);
  const base = await buildQmsAiContext(
    params.companyId,
    rulesLocale,
    params.childDoc.code,
    answers,
  );

  const parts: string[] = [];
  if (base) parts.push(base);

  const parentCode = params.childDoc.parentProcedureCode?.trim();
  if (parentCode) {
    const parent = await prisma.qMSDocument.findFirst({
      where: { companyId: params.companyId, code: parentCode, deletedAt: null },
      select: { code: true, title: true, content: true, clauseRefs: true },
    });
    if (parent) {
      const parentTitle = qmsDocTitle(parent.code, parent.title, rulesLocale);
      const body = (parent.content ?? "").trim().slice(0, 6000);
      const label =
        rulesLocale === "tr"
          ? `Üst prosedür (${parent.code} — ${parentTitle})`
          : `Parent procedure (${parent.code} — ${parentTitle})`;
      parts.push(
        body
          ? `${label}:\n${body}`
          : `${label}: ${rulesLocale === "tr" ? "içerik henüz yok; scaffold başlık ve madde referanslarına uy." : "content not yet filled; align with scaffold title and clause refs."}`,
      );
      if (parent.clauseRefs) {
        parts.push(
          rulesLocale === "tr"
            ? `İlgili madde referansları: ${parent.clauseRefs}`
            : `Related clause refs: ${parent.clauseRefs}`,
        );
      }
    }
  }

  const layer = (params.childDoc.layer as QmsDocumentLayer) ?? inferQmsLayerFromCode(params.childDoc.code);
  const layerGuide = childLayerAiGuidance(layer, rulesLocale);
  if (layerGuide) {
    const layerLabel = rulesLocale === "tr" ? "Doküman türü beklentisi" : "Document type expectation";
    parts.push(`${layerLabel}:\n${layerGuide}`);
  }

  const childLabel =
    rulesLocale === "tr"
      ? `Oluşturulacak alt doküman: ${params.childDoc.code ?? "—"} — ${params.childDoc.title}`
      : `Child document to generate: ${params.childDoc.code ?? "—"} — ${params.childDoc.title}`;
  parts.push(childLabel);

  if (params.userContext?.trim()) {
    const hintLabel = rulesLocale === "tr" ? "Kullanıcı detay notu (öncelikli)" : "User detail note (priority)";
    parts.push(`${hintLabel}:\n${params.userContext.trim()}`);
  }

  const parentForContext = parentCode ?? params.childDoc.parentProcedureCode?.trim();
  if (parentForContext && procedureUsesProductContext(parentForContext)) {
    const portfolio = await buildCompanyProductsContext(params.companyId, rulesLocale);
    parts.push(portfolio);
  }

  return parts.filter(Boolean).join("\n\n");
}

async function loadProcedure(companyId: string, procedureCode: string) {
  const code = procedureCode.trim().toUpperCase();
  const doc = await prisma.qMSDocument.findFirst({
    where: { companyId, code, deletedAt: null, layer: "PROCEDURE" },
  });
  if (!doc) throw new NotFoundError("Procedure not found");
  return doc;
}

export async function createProcedureChildDocument(params: {
  companyId: string;
  procedureCode: string;
  layer: QmsDocumentLayer;
  title: string;
  code?: string;
}): Promise<{ id: string; code: string }> {
  const parent = await loadProcedure(params.companyId, params.procedureCode);
  const parentCode = parent.code!.trim();

  const siblings = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, parentProcedureCode: parentCode, deletedAt: null },
    select: { code: true },
  });
  const allCodes = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, deletedAt: null },
    select: { code: true },
  });
  const codeSet = new Set(allCodes.map((d) => d.code?.trim()).filter(Boolean) as string[]);

  let code = params.code?.trim().toUpperCase();
  if (!code) {
    code = suggestNextChildCode(
      parentCode,
      params.layer,
      siblings.map((s) => s.code ?? "").filter(Boolean),
    );
  }
  if (codeSet.has(code)) throw new BadRequestError(`Document code already exists: ${code}`);

  const title = params.title.trim() || code;
  const created = await prisma.qMSDocument.create({
    data: {
      companyId: params.companyId,
      code,
      title,
      standard: parent.standard,
      layer: params.layer,
      parentProcedureCode: parentCode,
      clauseRefs: parent.clauseRefs,
      status: "MISSING",
      version: DEFAULT_QMS_REVISION,
      revisionNo: 0,
    },
    select: { id: true, code: true },
  });

  return { id: created.id, code: created.code! };
}

export async function generateProcedureChild(params: {
  companyId: string;
  documentId: string;
  locale: Lang;
  generatedBy: string;
  userContext?: string;
  operationalLink?: { module: import("@/lib/operational/modules").OperationalLinkModule; id: string };
}) {
  const doc = await prisma.qMSDocument.findFirst({
    where: { id: params.documentId, companyId: params.companyId, deletedAt: null },
  });
  if (!doc) throw new NotFoundError();

  const wizardAnswers = await loadQmsWizardAnswers(params.companyId);
  const fullContext = await buildProcedureChildAiContext({
    companyId: params.companyId,
    locale: params.locale,
    childDoc: doc,
    userContext: params.userContext,
    wizardAnswers,
  });

  return generateQmsDocument(
    params.companyId,
    params.documentId,
    params.locale,
    params.generatedBy,
    fullContext,
    wizardAnswers,
    params.operationalLink,
  );
}

export async function createAndGenerateProcedureChild(params: {
  companyId: string;
  procedureCode: string;
  layer: QmsDocumentLayer;
  title: string;
  userContext?: string;
  locale: Lang;
  generatedBy: string;
  code?: string;
}) {
  const { id, code } = await createProcedureChildDocument({
    companyId: params.companyId,
    procedureCode: params.procedureCode,
    layer: params.layer,
    title: params.title,
    code: params.code,
  });

  const gen = await generateProcedureChild({
    companyId: params.companyId,
    documentId: id,
    locale: params.locale,
    generatedBy: params.generatedBy,
    userContext: params.userContext,
  });

  return { documentId: id, code, generate: gen };
}

export interface ProcedureChildrenGenerateResult {
  generated: { code: string; documentId: string }[];
  skipped: string[];
  failed: { code: string; error: string }[];
}

export async function generateAllProcedureChildren(params: {
  companyId: string;
  procedureCode: string;
  locale: Lang;
  generatedBy: string;
  onlyEmpty?: boolean;
  childHints?: Record<string, string>;
  ensurePack?: boolean;
}): Promise<ProcedureChildrenGenerateResult> {
  const parent = await loadProcedure(params.companyId, params.procedureCode);
  const parentCode = parent.code!.trim();

  if (params.ensurePack !== false) {
    await ensureProcedurePack(params.companyId, parentCode);
  }

  const allChildren = await prisma.qMSDocument.findMany({
    where: {
      companyId: params.companyId,
      deletedAt: null,
      NOT: { layer: "PROCEDURE" },
    },
    orderBy: { code: "asc" },
  });

  const children = allChildren.filter((doc) => docLinkedToProcedure(doc, parentCode));

  const autoHints = getProcedurePackChildHints(parentCode, binaryContentLang(params.locale));
  const mergedHints = { ...autoHints, ...params.childHints };

  const generated: { code: string; documentId: string }[] = [];
  const skipped: string[] = [];
  const failed: { code: string; error: string }[] = [];

  for (const child of children) {
    const code = child.code?.trim() ?? child.id;
    if (
      !childContentNeedsRegeneration(child.content, child.layer, params.onlyEmpty !== false)
    ) {
      skipped.push(code);
      continue;
    }
    try {
      const hint = child.code ? mergedHints[child.code] : undefined;
      const result = await generateProcedureChild({
        companyId: params.companyId,
        documentId: child.id,
        locale: params.locale,
        generatedBy: params.generatedBy,
        userContext: hint,
      });
      if (result.content.trim()) {
        generated.push({ code, documentId: child.id });
      } else {
        failed.push({ code, error: "empty_content" });
      }
    } catch (err) {
      failed.push({
        code,
        error: err instanceof Error ? err.message : "generate_failed",
      });
    }
  }

  return { generated, skipped, failed };
}
