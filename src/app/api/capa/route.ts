import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  productId: z.string().optional().nullable(),
  rootCause: z.string().max(8000).optional().nullable(),
  correction: z.string().max(8000).optional().nullable(),
  correctiveAction: z.string().max(8000).optional().nullable(),
  ownerName: z.string().max(200).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const patchSchema = createSchema.partial().extend({
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE"]).optional(),
});

async function listCapas(companyId: string, productId?: string) {
  return prisma.cAPA.findMany({
    where: { companyId, ...(productId ? { productId } : {}) },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("VIEWER");
    const productId = new URL(req.url).searchParams.get("productId")?.trim() || undefined;
    const rows = await listCapas(ctx.companyId, productId);
    return NextResponse.json({
      capas: rows.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        rootCause: c.rootCause,
        correction: c.correction,
        correctiveAction: c.correctiveAction,
        ownerName: c.ownerName,
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        productId: c.productId,
        productName: c.product?.name ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (parsed.data.productId) {
      const product = await prisma.product.findFirst({
        where: { id: parsed.data.productId, companyId: ctx.companyId, deletedAt: null },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const capa = await prisma.cAPA.create({
      data: {
        companyId: ctx.companyId,
        title: parsed.data.title,
        productId: parsed.data.productId ?? null,
        rootCause: parsed.data.rootCause,
        correction: parsed.data.correction,
        correctiveAction: parsed.data.correctiveAction,
        ownerName: parsed.data.ownerName,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: "OPEN",
      },
      include: { product: { select: { name: true } } },
    });

    await writeAuditLog({
      action: "capa.create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "CAPA",
      entityId: capa.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ capa });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
