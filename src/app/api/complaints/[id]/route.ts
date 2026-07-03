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
  description: z.string().max(8000).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  lotNumber: z.string().max(200).optional().nullable(),
  capaRequired: z.boolean().optional(),
  capaRef: z.string().max(100).optional().nullable(),
  ownerName: z.string().max(200).optional().nullable(),
  status: z.enum(["OPEN", "MONITORING", "CLOSED"]).optional(),
  formContent: z.string().max(500000).optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const complaint = await prisma.complaint.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let formContent = complaint.formContent;
    if (!formContent?.trim() && complaint.qmsDocumentId) {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: complaint.qmsDocumentId, companyId: ctx.companyId, deletedAt: null },
        select: { content: true },
      });
      formContent = doc?.content ?? null;
    }

    return NextResponse.json({
      complaint: {
        id: complaint.id,
        title: complaint.title,
        complaintNo: complaint.complaintNo,
        description: complaint.description,
        status: complaint.status,
        capaRequired: complaint.capaRequired,
        capaRef: complaint.capaRef,
        lotNumber: complaint.lotNumber,
        source: complaint.source,
        ownerName: complaint.ownerName,
        productId: complaint.productId,
        productName: complaint.product?.name ?? null,
        qmsDocumentId: complaint.qmsDocumentId,
        formContent,
        receivedAt: complaint.receivedAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/complaints GET id]", err);
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

    const existing = await prisma.complaint.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { ...parsed.data };
    delete updateData.locale;

    if (parsed.data.formContent !== undefined) {
      const { complaintFieldsFromFormContent } = await import("@/lib/operational/form-fields");
      const parsedFields = complaintFieldsFromFormContent(parsed.data.formContent, existing.title);
      Object.assign(updateData, {
        formContent: parsed.data.formContent,
        ...(parsedFields.title ? { title: parsedFields.title } : {}),
        ...(parsedFields.complaintNo != null ? { complaintNo: parsedFields.complaintNo } : {}),
        ...(parsedFields.description != null ? { description: parsedFields.description } : {}),
        ...(parsedFields.lotNumber != null ? { lotNumber: parsedFields.lotNumber } : {}),
        ...(parsedFields.source != null ? { source: parsedFields.source } : {}),
        ...(parsedFields.ownerName != null ? { ownerName: parsedFields.ownerName } : {}),
        ...(parsedFields.capaRef != null ? { capaRef: parsedFields.capaRef } : {}),
        capaRequired: parsedFields.capaRequired,
        ...(parsedFields.status && !parsed.data.status ? { status: parsedFields.status } : {}),
        ...(parsedFields.receivedAt ? { receivedAt: parsedFields.receivedAt } : {}),
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

    const complaint = await prisma.complaint.update({
      where: { id: params.id },
      data: {
        title: updateData.title as string | undefined,
        productId: updateData.productId as string | null | undefined,
        description: updateData.description as string | null | undefined,
        source: updateData.source as string | null | undefined,
        lotNumber: updateData.lotNumber as string | null | undefined,
        capaRequired: updateData.capaRequired as boolean | undefined,
        capaRef: updateData.capaRef as string | null | undefined,
        ownerName: updateData.ownerName as string | null | undefined,
        formContent: updateData.formContent as string | undefined,
        status: updateData.status as typeof existing.status | undefined,
        complaintNo: updateData.complaintNo as string | null | undefined,
        receivedAt: updateData.receivedAt instanceof Date ? updateData.receivedAt : undefined,
      },
      include: { product: { select: { name: true } } },
    });

    await writeAuditLog({
      action: "complaint.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Complaint",
      entityId: complaint.id,
      metadata: { fields: Object.keys(parsed.data) },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ complaint });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/complaints PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const existing = await prisma.complaint.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.complaint.delete({ where: { id: params.id } });

    await writeAuditLog({
      action: "complaint.delete",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Complaint",
      entityId: params.id,
      ip: ipFromRequest(_req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/complaints DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
