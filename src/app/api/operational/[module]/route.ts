import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getModuleDef } from "@/lib/operational/modules";
import {
  createOperationalRecord,
  listOperationalRecords,
} from "@/lib/operational/record-service";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  productId: z.string().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: { module: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

    const productId = new URL(_req.url).searchParams.get("productId")?.trim() || undefined;
    const records = await listOperationalRecords(ctx.companyId, def.kind, productId);
    return NextResponse.json({ records });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { module: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

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

    const record = await createOperationalRecord(ctx.companyId, def, {
      title: parsed.data.title,
      productId: parsed.data.productId,
    });

    await writeAuditLog({
      action: "operational.create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: def.kind,
      entityId: record.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ record });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
