import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { coerceLanguage } from "@/lib/exports/i18n";
import { prisma } from "@/lib/db";
import { getModuleDef } from "@/lib/operational/modules";
import { respondOperationalFormExport } from "@/lib/operational/respond-form-export";

export const runtime = "nodejs";

function parseFormat(value: string | null): "docx" | "pdf" {
  return value?.toLowerCase() === "pdf" ? "pdf" : "docx";
}

/** Legacy Word-only URL. */
export async function GET(
  req: Request,
  { params }: { params: { module: string; id: string } },
) {
  try {
    const ctx = await requireCompany();
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

    const url = new URL(req.url);
    const lang = coerceLanguage(url.searchParams.get("lang"));
    const format = parseFormat(url.searchParams.get("format") ?? "docx");

    const record = await prisma.qmsOperationalRecord.findFirst({
      where: { id: params.id, companyId: ctx.companyId, module: def.kind },
    });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return await respondOperationalFormExport({
      companyId: ctx.companyId,
      generatedBy: ctx.user.name ?? ctx.user.email,
      formContent: record.formContent,
      formCode: record.formCode,
      qmsDocumentId: record.qmsDocumentId,
      referenceNo: record.referenceNo,
      title: record.title,
      fileSuffix: record.referenceNo ?? record.id.slice(0, 8),
      lang,
      format,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational docx GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
