import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { TECHNICAL_FILE_TEMPLATE, QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import type { Lang } from "@/lib/i18n/locales";
import { binaryContentLang } from "@/lib/i18n/locales";
import { resolveDictionary } from "@/lib/i18n/resolve";
import { fmtRegisterDate, revisionNoToLabel } from "@/lib/qms/revision";
import type { DocStatus } from "@/lib/domain/types";

export interface DocumentRegisterRow {
  code: string;
  title: string;
  reference: string | null;
  revision: string;
  issueDate: string | null;
  revisionDate: string | null;
  status: DocStatus;
  owner: string | null;
}

export interface DocumentRegisterBundle {
  companyName: string;
  productName: string | null;
  technicalFile: DocumentRegisterRow[];
  iso13485: DocumentRegisterRow[];
  iso9001: DocumentRegisterRow[];
}

function tfSectionCode(key: string): string {
  const idx = TECHNICAL_FILE_TEMPLATE.findIndex((t) => t.key === key);
  const order = idx >= 0 ? idx : 0;
  return `TF-${String(order + 1).padStart(2, "0")}`;
}

function tfSectionTitle(key: string, fallback: string, lang: Lang): string {
  const k = `tf.section.${key}`;
  const lbl = resolveDictionary(lang)[k];
  return lbl && lbl !== k ? lbl : fallback;
}

export async function loadDocumentRegister(
  companyId: string,
  productId: string | undefined,
  lang: Lang,
): Promise<DocumentRegisterBundle> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  if (!company) throw new NotFoundError();

  await scaffoldCompanyQms(companyId, ["ISO 13485"]);

  let productName: string | null = null;
  let technicalFile: DocumentRegisterRow[] = [];

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
      select: {
        name: true,
        technicalSections: {
          orderBy: { order: "asc" },
          select: {
            key: true,
            title: true,
            annexRef: true,
            status: true,
            ownerName: true,
            revisionNo: true,
            issueDate: true,
            revisionDate: true,
            applicable: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundError();

    productName = product.name;
    const tfKeys = new Set(TECHNICAL_FILE_TEMPLATE.map((t) => t.key));
    technicalFile = product.technicalSections
      .filter((s) => tfKeys.has(s.key) && s.applicable)
      .map((s) => ({
        code: tfSectionCode(s.key),
        title: tfSectionTitle(s.key, s.title, lang),
        reference: s.annexRef,
        revision: revisionNoToLabel(s.revisionNo ?? 0),
        issueDate: fmtRegisterDate(s.issueDate, binaryContentLang(lang)) || null,
        revisionDate: fmtRegisterDate(s.revisionDate ?? s.issueDate, binaryContentLang(lang)) || null,
        status: s.status as DocStatus,
        owner: s.ownerName,
      }));
  }

  const qmsRows = await prisma.qMSDocument.findMany({
    where: {
      companyId,
      deletedAt: null,
      NOT: [
        { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } },
        { code: { startsWith: "9001-" } },
      ],
    },
    orderBy: { code: "asc" },
    select: {
      code: true,
      title: true,
      standard: true,
      clauseRefs: true,
      status: true,
      preparedBy: true,
      version: true,
      revisionNo: true,
      issueDate: true,
      revisionDate: true,
    },
  });

  const toRow = (d: typeof qmsRows[number]): DocumentRegisterRow => ({
    code: d.code ?? "—",
    title: qmsDocTitle(d.code, d.title, lang),
    reference: d.clauseRefs,
    revision: revisionNoToLabel(d.revisionNo ?? 0),
    issueDate: fmtRegisterDate(d.issueDate, binaryContentLang(lang)) || null,
    revisionDate: fmtRegisterDate(d.revisionDate ?? d.issueDate, binaryContentLang(lang)) || null,
    status: d.status as DocStatus,
    owner: d.preparedBy,
  });

  const iso13485 = qmsRows.filter((d) => d.standard === "ISO 13485").map(toRow);
  const iso9001 = qmsRows.filter((d) => d.standard === "ISO 9001").map(toRow);

  return {
    companyName: company.name,
    productName,
    technicalFile,
    iso13485,
    iso9001,
  };
}
