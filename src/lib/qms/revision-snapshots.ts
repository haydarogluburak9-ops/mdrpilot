import "server-only";
import { prisma } from "@/lib/db";
import { revisionNoToLabel } from "@/lib/qms/revision";

/** Store immutable content snapshot before a revision bump or first publish. */
export async function snapshotQmsDocumentRevision(params: {
  documentId: string;
  revisionNo: number;
  content: string;
  changeNote?: string;
  preparedBy?: string;
  sourceFileId?: string;
}): Promise<void> {
  const content = params.content.trim();
  if (!content) return;

  await prisma.qmsDocumentRevision.upsert({
    where: {
      documentId_revisionNo: {
        documentId: params.documentId,
        revisionNo: params.revisionNo,
      },
    },
    create: {
      documentId: params.documentId,
      revisionNo: params.revisionNo,
      version: revisionNoToLabel(params.revisionNo),
      content,
      changeNote: params.changeNote,
      preparedBy: params.preparedBy,
      sourceFileId: params.sourceFileId,
    },
    update: {
      content,
      changeNote: params.changeNote,
      preparedBy: params.preparedBy,
      sourceFileId: params.sourceFileId,
    },
  });
}

export async function listQmsDocumentRevisions(documentId: string) {
  return prisma.qmsDocumentRevision.findMany({
    where: { documentId },
    orderBy: { revisionNo: "desc" },
    select: {
      id: true,
      revisionNo: true,
      version: true,
      changeNote: true,
      preparedBy: true,
      sourceFileId: true,
      createdAt: true,
    },
  });
}

export async function getQmsDocumentRevisionContent(documentId: string, revisionNo: number) {
  return prisma.qmsDocumentRevision.findUnique({
    where: { documentId_revisionNo: { documentId, revisionNo } },
    select: { content: true, version: true, changeNote: true, preparedBy: true, createdAt: true },
  });
}
