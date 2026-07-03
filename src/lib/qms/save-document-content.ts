import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import {
  appendRevisionHistory,
  parseRevisionHistory,
  planQmsRevisionOnContentChange,
  revisionNoToLabel,
} from "@/lib/qms/revision";
import { snapshotQmsDocumentRevision } from "@/lib/qms/revision-snapshots";
import type { OperationalLinkModule } from "@/lib/operational/modules";
import type { DocStatus } from "@/lib/domain/types";

export async function saveQmsDocumentContent(params: {
  companyId: string;
  documentId: string;
  content: string;
  savedBy: string;
  locale: "tr" | "en";
  userContext?: string;
  skipOperationalSync?: boolean;
  operationalLink?: { module: OperationalLinkModule; id: string };
}) {
  const doc = await prisma.qMSDocument.findFirst({
    where: { id: params.documentId, companyId: params.companyId, deletedAt: null },
  });
  if (!doc) throw new NotFoundError();

  const content = params.content.trim();
  if (!content) throw new BadRequestError("content_required");

  const now = new Date();
  const plan = planQmsRevisionOnContentChange({
    status: doc.status as DocStatus,
    revisionNo: doc.revisionNo ?? 0,
    issueDate: doc.issueDate,
  });

  const entry = {
    rev: plan.revisionNo,
    date: now.toISOString().slice(0, 10),
    by: params.savedBy,
    note: plan.bump
      ? params.locale === "tr"
        ? "Manuel düzenleme (revize)"
        : "Manual edit (revision)"
      : params.locale === "tr"
        ? "Manuel düzenleme"
        : "Manual edit",
  };
  let history = parseRevisionHistory(doc.revisionHistoryJson);
  if (plan.bump) {
    history = appendRevisionHistory(history, entry);
  } else if (history.length === 0) {
    history = [entry];
  }

  if (doc.content?.trim() && plan.bump) {
    await snapshotQmsDocumentRevision({
      documentId: doc.id,
      revisionNo: doc.revisionNo ?? 0,
      content: doc.content,
      changeNote: params.locale === "tr" ? "Revizyon öncesi arşiv" : "Archived before revision",
      preparedBy: doc.preparedBy ?? params.savedBy,
    });
  }

  const updated = await prisma.qMSDocument.update({
    where: { id: doc.id },
    data: {
      content,
      contentTranslationsJson: Prisma.DbNull,
      status: plan.status,
      revisionNo: plan.revisionNo,
      version: revisionNoToLabel(plan.revisionNo),
      revisionDate: plan.bump ? now : doc.revisionDate ?? now,
      revisionHistoryJson: history as unknown as object,
    },
    select: { id: true, status: true, version: true, revisionNo: true, code: true },
  });

  await snapshotQmsDocumentRevision({
    documentId: doc.id,
    revisionNo: plan.revisionNo,
    content,
    changeNote: entry.note,
    preparedBy: params.savedBy,
  });

  const { syncOperationalFormFromQmsDoc } = await import("@/lib/qms/sync-operational-forms");
  const sync = params.skipOperationalSync
    ? ({ synced: false, reason: "not_operational_form" } as const)
    : await syncOperationalFormFromQmsDoc({
    companyId: params.companyId,
    documentId: doc.id,
    code: updated.code ?? doc.code,
    content,
    userContext: params.userContext,
    operationalLink: params.operationalLink,
  });

  return {
    id: updated.id,
    status: updated.status as DocStatus,
    version: revisionNoToLabel(updated.revisionNo ?? 0),
    sync,
  };
}
