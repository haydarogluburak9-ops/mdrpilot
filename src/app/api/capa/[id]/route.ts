import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  productId: z.string().optional().nullable(),
  rootCause: z.string().max(8000).optional().nullable(),
  correction: z.string().max(8000).optional().nullable(),
  correctiveAction: z.string().max(8000).optional().nullable(),
  ownerName: z.string().max(200).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"]).optional(),
  formContent: z.string().max(500000).optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const capa = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let formContent = capa.formContent;
    if (!formContent?.trim() && capa.qmsDocumentId) {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: capa.qmsDocumentId, companyId: ctx.companyId, deletedAt: null },
        select: { content: true },
      });
      formContent = doc?.content ?? null;
    }

    return NextResponse.json({
      capa: {
        id: capa.id,
        title: capa.title,
        status: capa.status,
        referenceNo: capa.referenceNo,
        rootCause: capa.rootCause,
        correction: capa.correction,
        correctiveAction: capa.correctiveAction,
        ownerName: capa.ownerName,
        dueDate: capa.dueDate ? capa.dueDate.toISOString() : null,
        productId: capa.productId,
        productName: capa.product?.name ?? null,
        qmsDocumentId: capa.qmsDocumentId,
        formContent,
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const existing = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { ...parsed.data };
    delete updateData.locale;

    if (parsed.data.formContent !== undefined) {
      const { capaFieldsFromFormContent } = await import("@/lib/operational/form-fields");
      const parsedFields = capaFieldsFromFormContent(parsed.data.formContent, existing.title);
      Object.assign(updateData, {
        formContent: parsed.data.formContent,
        ...(parsedFields.title ? { title: parsedFields.title } : {}),
        ...(parsedFields.referenceNo != null ? { referenceNo: parsedFields.referenceNo } : {}),
        ...(parsedFields.rootCause != null ? { rootCause: parsedFields.rootCause } : {}),
        ...(parsedFields.correction != null ? { correction: parsedFields.correction } : {}),
        ...(parsedFields.correctiveAction != null ? { correctiveAction: parsedFields.correctiveAction } : {}),
        ...(parsedFields.ownerName != null ? { ownerName: parsedFields.ownerName } : {}),
        ...(parsedFields.dueDate != null ? { dueDate: parsedFields.dueDate } : {}),
        ...(parsedFields.status && !parsed.data.status ? { status: parsedFields.status } : {}),
      });

      if (existing.qmsDocumentId) {
        const { saveQmsDocumentContent } = await import("@/lib/qms/save-document-content");
        const savedBy = ctx.user.name ?? ctx.user.email;
        await saveQmsDocumentContent({
          companyId: ctx.companyId,
          documentId: existing.qmsDocumentId,
          content: parsed.data.formContent,
          savedBy,
          locale: parsed.data.locale ?? "tr",
          skipOperationalSync: true,
        });
      }
    }

    if (parsed.data.productId) {
      const product = await prisma.product.findFirst({
        where: { id: parsed.data.productId, companyId: ctx.companyId, deletedAt: null },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const capa = await prisma.cAPA.update({
      where: { id: params.id },
      data: {
        title: updateData.title as string | undefined,
        productId: updateData.productId as string | null | undefined,
        rootCause: updateData.rootCause as string | null | undefined,
        correction: updateData.correction as string | null | undefined,
        correctiveAction: updateData.correctiveAction as string | null | undefined,
        ownerName: updateData.ownerName as string | null | undefined,
        referenceNo: updateData.referenceNo as string | null | undefined,
        formContent: updateData.formContent as string | undefined,
        status: updateData.status as typeof existing.status | undefined,
        dueDate:
          updateData.dueDate instanceof Date
            ? updateData.dueDate
            : parsed.data.dueDate !== undefined
              ? parsed.data.dueDate
                ? new Date(parsed.data.dueDate)
                : null
              : undefined,
      },
      include: { product: { select: { name: true } } },
    });

    await writeAuditLog({
      action: "capa.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "CAPA",
      entityId: capa.id,
      metadata: { fields: Object.keys(parsed.data) },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ capa });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const existing = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.cAPA.delete({ where: { id: params.id } });

    await writeAuditLog({
      action: "capa.delete",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "CAPA",
      entityId: params.id,
      ip: ipFromRequest(_req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
