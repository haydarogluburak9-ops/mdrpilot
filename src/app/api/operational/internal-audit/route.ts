import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import {
  createInternalAuditCycle,
  listInternalAuditCycles,
} from "@/lib/operational/internal-audit-service";

export const runtime = "nodejs";

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
});

export async function GET() {
  try {
    const ctx = await requireRole("VIEWER");
    const cycles = await listInternalAuditCycles(ctx.companyId);
    return NextResponse.json({ cycles });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/internal-audit GET]", err);
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

    const cycle = await createInternalAuditCycle(ctx.companyId, parsed.data.year);

    await writeAuditLog({
      action: "internal_audit.create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "INTERNAL_AUDIT",
      entityId: cycle.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ cycle });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/internal-audit POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
