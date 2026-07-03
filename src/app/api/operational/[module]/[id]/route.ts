import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getModuleDef } from "@/lib/operational/modules";
import {
  deleteOperationalRecord,
  getOperationalRecord,
  updateOperationalRecord,
} from "@/lib/operational/record-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  productId: z.string().optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE", "MONITORING"]).optional(),
  formContent: z.string().max(500000).optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { module: string; id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

    const record = await getOperationalRecord(ctx.companyId, params.id);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ record });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational GET id]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { module: string; id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
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

    const record = await updateOperationalRecord(ctx.companyId, params.id, def, {
      title: parsed.data.title,
      productId: parsed.data.productId,
      status: parsed.data.status,
      formContent: parsed.data.formContent,
      locale: parsed.data.locale,
    });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "operational.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: def.kind,
      entityId: record.id,
      metadata: { fields: Object.keys(parsed.data) },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ record });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { module: string; id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

    const ok = await deleteOperationalRecord(ctx.companyId, params.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "operational.delete",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: def.kind,
      entityId: params.id,
      ip: ipFromRequest(_req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
