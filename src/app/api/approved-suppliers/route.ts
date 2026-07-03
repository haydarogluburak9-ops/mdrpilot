import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(300),
  scope: z.string().max(2000).optional().nullable(),
  riskClass: z.string().max(50).optional().nullable(),
  status: z.enum(["APPROVED", "CONDITIONAL", "SUSPENDED"]).optional(),
  approvedAt: z.string().datetime().optional().nullable(),
  reEvalDue: z.string().datetime().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function GET() {
  try {
    const ctx = await requireRole("VIEWER");
    const rows = await prisma.approvedSupplier.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ reEvalDue: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      suppliers: rows.map((s) => ({
        id: s.id,
        name: s.name,
        scope: s.scope,
        riskClass: s.riskClass,
        status: s.status,
        approvedAt: s.approvedAt?.toISOString() ?? null,
        reEvalDue: s.reEvalDue?.toISOString() ?? null,
        notes: s.notes,
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/approved-suppliers GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const row = await prisma.approvedSupplier.create({
      data: {
        companyId: ctx.companyId,
        name: data.name,
        scope: data.scope,
        riskClass: data.riskClass,
        status: data.status ?? "APPROVED",
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : new Date(),
        reEvalDue: data.reEvalDue ? new Date(data.reEvalDue) : null,
        notes: data.notes,
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
    if (status === 500) console.error("[api/approved-suppliers POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
