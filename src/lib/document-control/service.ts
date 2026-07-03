import "server-only";
import { prisma } from "@/lib/db";
import type { DocumentSourceType } from "@prisma/client";
import type { DocStatus } from "@/lib/domain/types";

export type ControlledDocumentRow = {
  sourceType: DocumentSourceType;
  sourceId: string;
  code: string;
  title: string;
  revisionNo: number;
  status: DocStatus;
  ownerName: string | null;
  productId: string | null;
  productName: string | null;
  updatedAt: string;
  href: string;
  canApprove: boolean;
  lastApproval: {
    approvedByName: string;
    approvedAt: string;
    intentText: string;
  } | null;
};

export async function loadControlledDocuments(
  companyId: string,
  productId?: string,
): Promise<ControlledDocumentRow[]> {
  const rows: ControlledDocumentRow[] = [];

  const qmsDocs = await prisma.qMSDocument.findMany({
    where: { companyId, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        preparedBy: true,
        revisionNo: true,
        updatedAt: true,
      },
    orderBy: { code: "asc" },
  });
  for (const d of qmsDocs) {
    rows.push({
      sourceType: "QMS",
      sourceId: d.id,
      code: d.code ?? d.id,
      title: d.title,
      revisionNo: d.revisionNo,
      status: d.status as DocStatus,
      ownerName: d.preparedBy,
      productId: null,
      productName: null,
      updatedAt: d.updatedAt.toISOString(),
      href: `/qms/procedures/${encodeURIComponent(d.code ?? d.id)}`,
      canApprove: d.status === "IN_REVIEW",
      lastApproval: null,
    });
  }

  if (productId) {
    const [sections, composer, clinical, product] = await Promise.all([
      prisma.technicalFileSection.findMany({
        where: { productId, applicable: true },
        select: {
          id: true,
          key: true,
          title: true,
          status: true,
          ownerName: true,
          revisionNo: true,
          updatedAt: true,
        },
        orderBy: { order: "asc" },
      }),
      prisma.composerDocument.findMany({
        where: { companyId, productId, archivedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          version: true,
          updatedAt: true,
        },
      }),
      prisma.clinicalEvaluation.findUnique({
        where: { productId },
        select: {
          id: true,
          status: true,
          revisionNo: true,
          updatedAt: true,
        },
      }),
      prisma.product.findFirst({
        where: { id: productId, companyId },
        select: { name: true },
      }),
    ]);

    const pn = product?.name ?? null;

    for (const s of sections) {
      rows.push({
        sourceType: "TECHNICAL_FILE",
        sourceId: s.id,
        code: `TF-${s.key}`,
        title: s.title,
        revisionNo: s.revisionNo,
        status: s.status as DocStatus,
        ownerName: s.ownerName,
        productId,
        productName: pn,
        updatedAt: s.updatedAt.toISOString(),
        href: `/products/${productId}?tab=technical`,
        canApprove: s.status === "IN_REVIEW",
        lastApproval: null,
      });
    }

    for (const c of composer) {
      rows.push({
        sourceType: "COMPOSER",
        sourceId: c.id,
        code: `CMP-${c.id.slice(-6)}`,
        title: c.title,
        revisionNo: c.version,
        status: c.status as DocStatus,
        ownerName: null,
        productId,
        productName: pn,
        updatedAt: c.updatedAt.toISOString(),
        href: `/composer/${c.id}`,
        canApprove: c.status === "IN_REVIEW",
        lastApproval: null,
      });
    }

    if (clinical) {
      rows.push({
        sourceType: "CLINICAL_EVAL",
        sourceId: clinical.id,
        code: "CER",
        title: "Clinical Evaluation Report",
        revisionNo: clinical.revisionNo,
        status: clinical.status as DocStatus,
        ownerName: null,
        productId,
        productName: pn,
        updatedAt: clinical.updatedAt.toISOString(),
        href: `/products/${productId}?tab=clinical`,
        canApprove: clinical.status === "IN_REVIEW",
        lastApproval: null,
      });
    }
  }

  const approvals = await prisma.documentApproval.findMany({
    where: { companyId },
    orderBy: { approvedAt: "desc" },
  });
  const approvalMap = new Map<string, (typeof approvals)[0]>();
  for (const a of approvals) {
    const key = `${a.sourceType}:${a.sourceId}:${a.revisionNo}`;
    if (!approvalMap.has(key)) approvalMap.set(key, a);
  }

  return rows.map((r) => {
    const key = `${r.sourceType}:${r.sourceId}:${r.revisionNo}`;
    const ap = approvalMap.get(key);
    return {
      ...r,
      lastApproval: ap
        ? {
            approvedByName: ap.approvedByName,
            approvedAt: ap.approvedAt.toISOString(),
            intentText: ap.intentText,
          }
        : null,
    };
  });
}

export async function approveControlledDocument(input: {
  companyId: string;
  userId: string;
  userName: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  intentText: string;
  ipAddress?: string;
}) {
  const intent = input.intentText.trim();
  if (intent.length < 10) {
    throw new Error("docControl.intentTooShort");
  }

  let title = "";
  let revisionNo = 0;

  switch (input.sourceType) {
    case "QMS": {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: input.sourceId, companyId: input.companyId, deletedAt: null },
      });
      if (!doc) throw new Error("Not found");
      if (doc.status !== "IN_REVIEW") throw new Error("docControl.notInReview");
      title = `${doc.code} — ${doc.title}`;
      revisionNo = doc.revisionNo;
      await prisma.qMSDocument.update({
        where: { id: doc.id },
        data: { status: "APPROVED" },
      });
      break;
    }
    case "TECHNICAL_FILE": {
      const sec = await prisma.technicalFileSection.findFirst({
        where: { id: input.sourceId, product: { companyId: input.companyId } },
      });
      if (!sec) throw new Error("Not found");
      if (sec.status !== "IN_REVIEW") throw new Error("docControl.notInReview");
      title = sec.title;
      revisionNo = sec.revisionNo;
      await prisma.technicalFileSection.update({
        where: { id: sec.id },
        data: { status: "APPROVED" },
      });
      break;
    }
    case "COMPOSER": {
      const doc = await prisma.composerDocument.findFirst({
        where: { id: input.sourceId, companyId: input.companyId, archivedAt: null },
      });
      if (!doc) throw new Error("Not found");
      if (doc.status !== "IN_REVIEW") throw new Error("docControl.notInReview");
      title = doc.title;
      revisionNo = doc.version;
      await prisma.composerDocument.update({
        where: { id: doc.id },
        data: { status: "APPROVED", approvedById: input.userId, approvedAt: new Date() },
      });
      break;
    }
    case "CLINICAL_EVAL": {
      const ce = await prisma.clinicalEvaluation.findFirst({
        where: { id: input.sourceId, product: { companyId: input.companyId } },
      });
      if (!ce) throw new Error("Not found");
      if (ce.status !== "IN_REVIEW") throw new Error("docControl.notInReview");
      title = "Clinical Evaluation Report";
      revisionNo = ce.revisionNo;
      await prisma.clinicalEvaluation.update({
        where: { id: ce.id },
        data: { status: "APPROVED", approvedById: input.userId, approvedAt: new Date() },
      });
      break;
    }
  }

  const approval = await prisma.documentApproval.create({
    data: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      documentTitle: title,
      revisionNo,
      approvedById: input.userId,
      approvedByName: input.userName,
      intentText: intent,
      ipAddress: input.ipAddress,
    },
  });

  return approval;
}

export async function listApprovalHistory(companyId: string, limit = 100) {
  const rows = await prisma.documentApproval.findMany({
    where: { companyId },
    orderBy: { approvedAt: "desc" },
    take: limit,
  });
  return rows.map((a) => ({
    id: a.id,
    sourceType: a.sourceType,
    sourceId: a.sourceId,
    documentTitle: a.documentTitle,
    revisionNo: a.revisionNo,
    approvedByName: a.approvedByName,
    intentText: a.intentText,
    approvedAt: a.approvedAt.toISOString(),
  }));
}
