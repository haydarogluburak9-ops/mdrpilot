import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  scope: z.string().max(2000).optional().nullable(),
  riskClass: z.string().max(50).optional().nullable(),
  status: z.enum(["APPROVED", "CONDITIONAL", "SUSPENDED"]).optional(),
  approvedAt: z.string().datetime().optional().nullable(),
  reEvalDue: z.string().datetime().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const existing = await prisma.approvedSupplier.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const row = await prisma.approvedSupplier.update({
      where: { id: params.id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.scope !== undefined ? { scope: d.scope } : {}),
        ...(d.riskClass !== undefined ? { riskClass: d.riskClass } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.approvedAt !== undefined
          ? { approvedAt: d.approvedAt ? new Date(d.approvedAt) : null }
          : {}),
        ...(d.reEvalDue !== undefined
          ? { reEvalDue: d.reEvalDue ? new Date(d.reEvalDue) : null }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
      },
    });

    return NextResponse.json({
      supplier: {
        id: row.id,
        name: row.name,
        scope: row.scope,
        riskClass: row.riskClass,
        status: row.status,
        approvedAt: row.approvedAt?.toISOString() ?? null,
        reEvalDue: row.reEvalDue?.toISOString() ?? null,
        notes: row.notes,
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/approved-suppliers PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const existing = await prisma.approvedSupplier.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.approvedSupplier.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/approved-suppliers DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
