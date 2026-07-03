import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, hasRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { qmsStatusBlockReason } from "@/lib/qms/document-status";
import {
  appendRevisionHistory,
  revisionNoToLabel,
} from "@/lib/qms/revision";
import type { DocStatus } from "@/lib/domain/types";
import { appLocaleSchema, parseAppLocale } from "@/lib/i18n/api-locale";
import { binaryContentLang } from "@/lib/i18n/locales";
import { OPERATIONAL_MODULE_SLUGS, type OperationalLinkModule } from "@/lib/operational/modules";

const operationalLinkModuleSchema = z.enum([
  "capa",
  "complaint",
  ...OPERATIONAL_MODULE_SLUGS,
] as [string, string, ...string[]]);

export const runtime = "nodejs";

const patchSchema = z
  .object({
    status: z.enum(["MISSING", "DRAFT", "IN_REVIEW", "APPROVED"]).optional(),
    content: z.string().min(1).max(500000).optional(),
    locale: appLocaleSchema.optional(),
    reviewDueDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
    userContext: z.string().max(8000).optional(),
    operationalLink: z
      .object({
        module: operationalLinkModuleSchema,
        id: z.string().min(1),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.content !== undefined ||
      data.reviewDueDate !== undefined,
    { message: "status, content or reviewDueDate required" },
  );

// PATCH /api/qms/[id] — update workflow status or save document content (CONSULTANT+).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = patchSchema.parse(await req.json().catch(() => ({})));

    if (body.reviewDueDate !== undefined && body.status === undefined && body.content === undefined) {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
        select: { id: true },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const reviewDueDate =
        body.reviewDueDate === null ? null : new Date(`${body.reviewDueDate}T12:00:00.000Z`);

      const updated = await prisma.qMSDocument.update({
        where: { id: doc.id },
        data: { reviewDueDate },
        select: { id: true, reviewDueDate: true },
      });

      await writeAuditLog({
        companyId: ctx.companyId,
        userId: ctx.user.id,
        action: "qms.review_due.update",
        entity: "QMSDocument",
        entityId: params.id,
        ip: ipFromRequest(req),
      });

      return NextResponse.json({
        ok: true,
        item: {
          id: updated.id,
          reviewDueDate: updated.reviewDueDate?.toISOString().slice(0, 10) ?? null,
        },
      });
    }

    if (body.content !== undefined) {
      const { saveQmsDocumentContent } = await import("@/lib/qms/save-document-content");
      const locale = binaryContentLang(parseAppLocale(body.locale));
      const savedBy = ctx.user.name ?? ctx.user.email;
      const item = await saveQmsDocumentContent({
        companyId: ctx.companyId,
        documentId: params.id,
        content: body.content,
        savedBy,
        locale,
        userContext: body.userContext,
        operationalLink: body.operationalLink as { module: OperationalLinkModule; id: string } | undefined,
      });

      await writeAuditLog({
        companyId: ctx.companyId,
        userId: ctx.user.id,
        action: "qms.content.update",
        entity: "QMSDocument",
        entityId: params.id,
        ip: ipFromRequest(req),
      });

      return NextResponse.json({ ok: true, item });
    }

    if (!body.status) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const doc = await prisma.qMSDocument.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        content: true,
        revisionNo: true,
        issueDate: true,
        reviewDueDate: true,
        revisionHistoryJson: true,
      },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const current = doc.status as DocStatus;
    const nextStatus = body.status!;
    if (nextStatus === current) {
      return NextResponse.json({
        ok: true,
        item: { id: doc.id, status: current, version: revisionNoToLabel(doc.revisionNo ?? 0) },
      });
    }

    if (nextStatus === "APPROVED" && !hasRole(ctx.role, "QUALITY_MANAGER")) {
      return NextResponse.json({ error: "qms.status.err.approveRole" }, { status: 403 });
    }

    const block = qmsStatusBlockReason({ status: current, content: doc.content }, nextStatus);
    if (block) return NextResponse.json({ error: block }, { status: 400 });

    const now = new Date();
    const by = ctx.user.name ?? ctx.user.email;
    const data: {
      status: DocStatus;
      publishedAt?: Date;
      approvedBy?: string;
      issueDate?: Date;
      revisionDate?: Date;
      revisionHistoryJson?: object;
      reviewDueDate?: Date;
    } = { status: nextStatus };

    if (nextStatus === "APPROVED") {
      data.publishedAt = now;
      data.approvedBy = by;
      data.revisionDate = now;
      if (!doc.issueDate) {
        data.issueDate = now;
      }
      if (!doc.reviewDueDate) {
        const nextReview = new Date(now);
        nextReview.setFullYear(nextReview.getFullYear() + 1);
        data.reviewDueDate = nextReview;
      }
      data.revisionHistoryJson = appendRevisionHistory(doc.revisionHistoryJson, {
        rev: doc.revisionNo ?? 0,
        date: now.toISOString().slice(0, 10),
        by,
        note: "Approved",
      }) as unknown as object;
    }

    const updated = await prisma.qMSDocument.update({
      where: { id: doc.id },
      data,
      select: { id: true, status: true, revisionNo: true, code: true },
    });

    if (nextStatus === "APPROVED" && updated.code?.startsWith("SOP-")) {
      const { scheduleTrainingForProcedureRevision } = await import("@/lib/eqms/training-matrix");
      await scheduleTrainingForProcedureRevision({
        companyId: ctx.companyId,
        procedureCode: updated.code,
        revisionNo: updated.revisionNo ?? 0,
      });
    }

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action: "qms.status.update",
      entity: "QMSDocument",
      entityId: doc.id,
      metadata: { code: doc.code, from: current, to: nextStatus },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        status: updated.status,
        version: revisionNoToLabel(updated.revisionNo ?? 0),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
