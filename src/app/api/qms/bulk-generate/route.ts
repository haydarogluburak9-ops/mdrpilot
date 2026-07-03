import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { bulkGenerateQmsDocuments } from "@/lib/qms/bulk-generate";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  standard: z.string().optional(),
  onlyEmpty: z.boolean().optional(),
  maxDocs: z.number().int().min(1).max(80).optional(),
});

// POST /api/qms/bulk-generate — AI drafts for all empty KYS documents
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parsed.data.locale ?? "tr";
    const generatedBy = ctx.user.name ?? ctx.user.email;
    const result = await bulkGenerateQmsDocuments({
      companyId: ctx.companyId,
      locale,
      generatedBy,
      standard: parsed.data.standard,
      onlyEmpty: parsed.data.onlyEmpty ?? true,
      maxDocs: parsed.data.maxDocs,
    });

    await writeAuditLog({
      action: "qms.bulk_generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      metadata: { ok: result.ok, failed: result.failed, total: result.total },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/bulk-generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
