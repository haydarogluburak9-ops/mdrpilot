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
  description: z.string().max(8000).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  lotNumber: z.string().max(200).optional().nullable(),
  capaRequired: z.boolean().optional(),
  capaRef: z.string().max(100).optional().nullable(),
  ownerName: z.string().max(200).optional().nullable(),
});

const patchSchema = createSchema.partial().extend({
  status: z.enum(["OPEN", "MONITORING", "CLOSED"]).optional(),
});

async function nextComplaintNo(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  const count = await prisma.complaint.count({
    where: { companyId, complaintNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("VIEWER");
    const productId = new URL(req.url).searchParams.get("productId")?.trim() || undefined;
    const rows = await prisma.complaint.findMany({
      where: { companyId: ctx.companyId, ...(productId ? { productId } : {}) },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { receivedAt: "desc" },
    });
    return NextResponse.json({
      complaints: rows.map((c) => ({
        id: c.id,
        complaintNo: c.complaintNo,
        title: c.title,
        description: c.description,
        source: c.source,
        lotNumber: c.lotNumber,
        status: c.status,
        capaRequired: c.capaRequired,
        capaRef: c.capaRef,
        ownerName: c.ownerName,
        productId: c.productId,
        productName: c.product?.name ?? null,
        receivedAt: c.receivedAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/complaints GET]", err);
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

    const capaRequired = parsed.data.capaRequired ?? false;
    const complaint = await prisma.complaint.create({
      data: {
        companyId: ctx.companyId,
        complaintNo: await nextComplaintNo(ctx.companyId),
        title: parsed.data.title,
        productId: parsed.data.productId ?? null,
        description: parsed.data.description,
        source: parsed.data.source,
        lotNumber: parsed.data.lotNumber,
        capaRequired,
        capaRef: parsed.data.capaRef,
        ownerName: parsed.data.ownerName,
        status: capaRequired ? "MONITORING" : "OPEN",
      },
      include: { product: { select: { name: true } } },
    });

    await writeAuditLog({
      action: "complaint.create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Complaint",
      entityId: complaint.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ complaint });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/complaints POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
