import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { generateQmsDocument } from "@/lib/qms/generate-document";
import { generateProcedureChild } from "@/lib/qms/procedure-document-service";
import type { OperationalLinkModule } from "@/lib/operational/modules";

export async function generateOperationalQmsForm(params: {
  companyId: string;
  formCode: string;
  sopCode: string;
  locale: "tr" | "en";
  generatedBy: string;
  userContext?: string;
  operationalLink?: { module: OperationalLinkModule; id: string };
}) {
  const formCode = params.formCode.trim().toUpperCase();
  const sopCode = params.sopCode.trim().toUpperCase();

  const qmsDoc = await prisma.qMSDocument.findFirst({
    where: {
      companyId: params.companyId,
      code: formCode,
      deletedAt: null,
      parentProcedureCode: sopCode,
    },
    select: { id: true },
  });
  if (!qmsDoc) throw new NotFoundError();

  const hint = params.userContext?.trim();
  const operationalLink = params.operationalLink;

  if (hint) {
    return generateProcedureChild({
      companyId: params.companyId,
      documentId: qmsDoc.id,
      locale: params.locale,
      generatedBy: params.generatedBy,
      userContext: hint,
      operationalLink,
    });
  }

  return generateQmsDocument(
    params.companyId,
    qmsDoc.id,
    params.locale,
    params.generatedBy,
    undefined,
    undefined,
    operationalLink,
  );
}
