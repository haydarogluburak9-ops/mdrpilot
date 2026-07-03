import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import {
  deleteInternalAuditCycle,
  getInternalAuditCycle,
  updateInternalAuditCycle,
} from "@/lib/operational/internal-audit-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "OVERDUE", "MONITORING"]).optional(),
  ownerName: z.string().max(200).optional().nullable(),
  planContent: z.string().max(500000).optional(),
  checklistContent: z.string().max(500000).optional(),
  reportContent: z.string().max(500000).optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const cycle = await getInternalAuditCycle(ctx.companyId, params.id);
    if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ cycle });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/internal-audit GET id]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

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

    const cycle = await updateInternalAuditCycle(ctx.companyId, params.id, parsed.data);
    if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "internal_audit.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "INTERNAL_AUDIT",
      entityId: cycle.id,
      metadata: { fields: Object.keys(parsed.data) },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ cycle });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/internal-audit PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const ok = await deleteInternalAuditCycle(ctx.companyId, params.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "internal_audit.delete",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "INTERNAL_AUDIT",
      entityId: params.id,
      ip: ipFromRequest(_req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/internal-audit DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
