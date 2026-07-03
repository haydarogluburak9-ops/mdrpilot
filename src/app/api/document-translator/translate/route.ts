import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { validateUpload } from "@/lib/files/config";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { translateUploadedDocument } from "@/lib/document-translator/service";
import type { TranslatorFileKind } from "@/lib/document-translator/types";
import { isTranslatorLocale, type TranslatorLocale } from "@/lib/document-translator/locales";

export const runtime = "nodejs";

const TRANSLATOR_KINDS = new Set<TranslatorFileKind>(["docx", "pdf", "xlsx"]);

function parseLang(v: FormDataEntryValue | null): TranslatorLocale | "auto" {
  if (isTranslatorLocale(v)) return v;
  return "auto";
}

function parseTarget(v: FormDataEntryValue | null): TranslatorLocale {
  return isTranslatorLocale(v) ? v : "en";
}

// POST /api/document-translator/translate — multipart: file, sourceLang, targetLang
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const limit = rateLimit(clientKey(req, "ai"));
    if (!limit.ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const sourceLang = parseLang(form.get("sourceLang"));
    const targetLang = parseTarget(form.get("targetLang"));
    const pdfOutputRaw = form.get("pdfOutputFormat");
    const pdfOutputFormat = pdfOutputRaw === "docx" ? "docx" : "pdf";

    const buf = Buffer.from(await file.arrayBuffer());
    const head = buf.subarray(0, Math.min(buf.length, 16));
    const validated = validateUpload({
      fileName: file.name,
      mimeType: file.type,
      size: buf.length,
      head,
    });
    if (!validated.ok || !validated.type) {
      return NextResponse.json({ error: validated.error ?? "Invalid file" }, { status: 400 });
    }

    const kind = validated.type.kind;
    if (!TRANSLATOR_KINDS.has(kind as TranslatorFileKind)) {
      return NextResponse.json({ error: "Only Word (.docx), PDF and Excel (.xlsx) are supported" }, { status: 400 });
    }

    const result = await translateUploadedDocument({
      buffer: buf,
      fileName: file.name,
      kind: kind as TranslatorFileKind,
      sourceLang,
      targetLang,
      pdfOutputFormat: kind === "pdf" ? pdfOutputFormat : undefined,
      companyId: ctx.companyId,
    });

    await writeAuditLog({
      action: "document-translator.translate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "UploadedFile",
      entityId: file.name,
      metadata: {
        sourceLang,
        targetLang,
        inputKind: kind,
        outputKind: result.outputKind,
        charCount: result.charCount,
        truncated: result.truncated,
      },
      ip: ipFromRequest(req),
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": contentDispositionAttachment(result.fileName),
        "Cache-Control": "no-store",
        "X-Translation-Truncated": result.truncated ? "1" : "0",
        "X-Translation-Output-Kind": result.outputKind,
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/document-translator/translate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
