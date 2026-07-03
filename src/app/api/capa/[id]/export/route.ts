import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { coerceLanguage } from "@/lib/exports/i18n";
import { prisma } from "@/lib/db";
import { respondOperationalFormExport } from "@/lib/operational/respond-form-export";

export const runtime = "nodejs";

function parseFormat(value: string | null): "docx" | "pdf" {
  return value?.toLowerCase() === "pdf" ? "pdf" : "docx";
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const lang = coerceLanguage(url.searchParams.get("lang"));
    const format = parseFormat(url.searchParams.get("format"));

    const capa = await prisma.cAPA.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return await respondOperationalFormExport({
      companyId: ctx.companyId,
      generatedBy: ctx.user.name ?? ctx.user.email,
      formContent: capa.formContent,
      formCode: "FORM-CAPA-01",
      qmsDocumentId: capa.qmsDocumentId,
      referenceNo: capa.referenceNo,
      title: capa.title,
      fileSuffix: capa.referenceNo ?? capa.id.slice(0, 8),
      lang,
      format,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa export GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
