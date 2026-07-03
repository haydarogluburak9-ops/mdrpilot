import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { createAuditExport, type AuditExportFormat } from "@/lib/audit-sim/export";
import { coerceLanguage } from "@/lib/exports/i18n";

export const runtime = "nodejs";

const FORMATS: AuditExportFormat[] = ["pdf", "docx", "findings", "capa"];

// POST /api/audit-simulator/[id]/export — generate an audit export via ExportJob (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { format?: string; language?: string };
    const format = (body.format ?? "pdf") as AuditExportFormat;
    if (!FORMATS.includes(format)) throw new BadRequestError("Invalid export format");

    const job = await createAuditExport({ companyId: ctx.companyId, userId: ctx.user.id, sessionId: params.id, format, ip: ipFromRequest(req), language: coerceLanguage(body.language) });
    return NextResponse.json({ job: { id: job.id, status: job.status, fileName: job.fileName } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator/[id]/export]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
