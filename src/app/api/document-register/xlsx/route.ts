import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { loadDocumentRegister } from "@/lib/document-register/load-register";
import { listProductsWithDossier } from "@/lib/data/queries";
import { buildDocumentRegisterXlsx } from "@/lib/exports/generators/document-register-xlsx";
import { coerceLanguage, exportLangToUiLang } from "@/lib/exports/i18n";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";

export const runtime = "nodejs";

// GET /api/document-register/xlsx?productId=...&lang=tr
export async function GET(req: Request) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const lang = exportLangToUiLang(coerceLanguage(url.searchParams.get("lang")));
    let productId = url.searchParams.get("productId") ?? undefined;

    if (!productId) {
      const products = await listProductsWithDossier(ctx.companyId);
      productId = products[0]?.id;
    }

    const data = await loadDocumentRegister(ctx.companyId, productId, lang);
    const buffer = await buildDocumentRegisterXlsx(data, lang);

    const stamp = new Date().toISOString().slice(0, 10);
    const fileName =
      lang === "tr"
        ? `Dokuman-Kayit-Defteri_${stamp}.xlsx`
        : `Document-Register_${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDispositionAttachment(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/document-register/xlsx]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
