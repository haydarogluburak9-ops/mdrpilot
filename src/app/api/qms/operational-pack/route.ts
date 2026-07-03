import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { runOperationalKysPack } from "@/lib/qms/operational-kys-pack";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  generateAi: z.boolean().optional(),
});

// POST /api/qms/operational-pack — fill empty KYS + operational sample records
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const result = await runOperationalKysPack({
      companyId: ctx.companyId,
      generatedBy: ctx.user.name ?? ctx.user.email,
      locale: parsed.data.locale ?? "tr",
      generateAi: parsed.data.generateAi ?? true,
    });

    await writeAuditLog({
      action: "qms.operational_pack",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      metadata: {
        bulkOk: result.bulkGenerate.ok,
        samples: result.sampleRecordsCreated.length + result.sampleRecordsUpdated.length,
        emptyRemaining: result.emptyRemaining,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/operational-pack]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
