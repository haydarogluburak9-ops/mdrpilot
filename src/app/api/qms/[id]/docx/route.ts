import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { coerceLanguage } from "@/lib/exports/i18n";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { buildQmsDocumentExport } from "@/lib/qms/build-document-export";

export const runtime = "nodejs";

// GET /api/qms/[id]/docx?lang=tr — legacy Word export (delegates to unified export).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const lang = coerceLanguage(url.searchParams.get("lang"));

    const { buffer, fileName, mimeType } = await buildQmsDocumentExport({
      companyId: ctx.companyId,
      documentId: params.id,
      lang,
      format: "docx",
      generatedBy: ctx.user.name ?? ctx.user.email,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": contentDispositionAttachment(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/docx]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
