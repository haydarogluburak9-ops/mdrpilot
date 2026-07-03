import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { buildDhfDocxBuffer, buildDhfPdfBuffer } from "@/lib/exports/generators/dhf-export";
import { coerceLanguage, exportLangToUiLang } from "@/lib/exports/i18n";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";

export const runtime = "nodejs";

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "dhf"
  );
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const exportLang = coerceLanguage(url.searchParams.get("lang"));
    const locale = exportLangToUiLang(exportLang);
    const format = url.searchParams.get("format") === "pdf" ? "pdf" : "docx";

    const exportInput = {
      companyId: ctx.companyId,
      productId: params.id,
      exportLang,
      generatedBy: ctx.user.name ?? ctx.user.email,
    };

    const buffer =
      format === "pdf"
        ? await buildDhfPdfBuffer(exportInput)
        : await buildDhfDocxBuffer(exportInput);

    const baseName =
      locale === "tr"
        ? `DHF-01 ${slug("tasarim-gecmis-dosyasi")} REV01`
        : `DHF-01 ${slug("design-history-file")} REV01`;
    const fileName = `${baseName}.${format}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": contentDispositionAttachment(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/design-control/export]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
