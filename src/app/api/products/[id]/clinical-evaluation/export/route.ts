import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { coerceLanguage } from "@/lib/exports/i18n";
import { buildZip } from "@/lib/exports/generators/zip-generator";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { getClinicalEvaluationForExport } from "@/lib/products/clinical-evaluation-service";
import {
  buildCerExportBuffer,
  type ClinicalExportLang,
} from "@/lib/products/clinical-export-buffers";
import { buildClinicalEvaluationPackage } from "@/lib/products/clinical-evaluation-package";

export const runtime = "nodejs";

// GET /api/products/[id]/clinical-evaluation/export?format=docx|pdf|zip|package&lang=tr|en|both
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const url = new URL(req.url);
    const formatParam = url.searchParams.get("format") ?? "docx";
    const langParam = url.searchParams.get("lang");

    if (
      formatParam !== "docx" &&
      formatParam !== "pdf" &&
      formatParam !== "zip" &&
      formatParam !== "package"
    ) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const product = await getClinicalEvaluationForExport(ctx.companyId, params.id);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const cer = product.clinicalEvaluation;
    if (!cer) {
      return NextResponse.json({ error: "No clinical evaluation — generate draft first" }, { status: 400 });
    }

    if (formatParam === "zip" || formatParam === "package") {
      const { entries, zipName } = await buildClinicalEvaluationPackage(ctx, params.id);
      if (entries.length === 0) {
        return NextResponse.json({ error: "Package is empty" }, { status: 400 });
      }
      const zipBuffer = await buildZip(entries);
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": contentDispositionAttachment(zipName),
          "Cache-Control": "no-store",
        },
      });
    }

    const lang: ClinicalExportLang =
      coerceLanguage(langParam) === "en" ? "en" : "tr";
    const format = formatParam as "docx" | "pdf";

    const { buffer, fileName } = await buildCerExportBuffer(
      product,
      cer,
      lang,
      ctx,
      format,
    );

    const mime =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": contentDispositionAttachment(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/export GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
