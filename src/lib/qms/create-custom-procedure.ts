import "server-only";
import { prisma } from "@/lib/db";
import { BadRequestError } from "@/lib/auth/errors";
import { DEFAULT_QMS_REVISION } from "@/lib/qms/revision";
import { generateQmsDocument } from "@/lib/qms/generate-document";
import type { Lang } from "@/lib/i18n/locales";

async function suggestCustomSopCode(companyId: string): Promise<string> {
  const existing = await prisma.qMSDocument.findMany({
    where: { companyId, code: { startsWith: "SOP-CUS-" }, deletedAt: null },
    select: { code: true },
  });
  let max = 0;
  for (const row of existing) {
    const m = row.code?.match(/^SOP-CUS-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `SOP-CUS-${String(max + 1).padStart(2, "0")}`;
}

export async function createCustomProcedure(params: {
  companyId: string;
  title: string;
  userContext: string;
  locale: Lang;
  standard?: string;
  clauseRefs?: string;
  generatedBy: string;
  generate?: boolean;
}): Promise<{ documentId: string; code: string; procedureHref: string }> {
  const title = params.title.trim();
  const context = params.userContext.trim();
  if (!title) throw new BadRequestError("title_required");
  if (!context) throw new BadRequestError("context_required");

  const code = await suggestCustomSopCode(params.companyId);
  const standard = params.standard?.trim() || "ISO 13485";

  const doc = await prisma.qMSDocument.create({
    data: {
      companyId: params.companyId,
      code,
      title,
      standard,
      layer: "PROCEDURE",
      clauseRefs: params.clauseRefs?.trim() || "4.2.4",
      status: "MISSING",
      version: DEFAULT_QMS_REVISION,
      revisionNo: 0,
    },
    select: { id: true, code: true },
  });

  if (params.generate !== false) {
    await generateQmsDocument(
      params.companyId,
      doc.id,
      params.locale,
      params.generatedBy,
      context,
    );
  }

  return {
    documentId: doc.id,
    code: doc.code ?? code,
    procedureHref: `/qms/procedures/${encodeURIComponent(doc.code ?? code)}`,
  };
}
