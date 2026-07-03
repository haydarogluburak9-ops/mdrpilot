import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { ipFromRequest } from "@/lib/audit";
import { uploadFile } from "@/lib/files/upload-service";
import { DOCUMENT_KINDS, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/files/config";
import type { DocumentKind } from "@prisma/client";

export const runtime = "nodejs";

// POST /api/files/upload — multipart/form-data (min role CONSULTANT; Viewers blocked).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");

    if (!rateLimit(clientKey(req, "upload")).ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_UPLOAD_MB} MB limit` }, { status: 413 });
    }

    const productId = (form.get("productId") as string | null) || undefined;
    const documentKindRaw = (form.get("documentKind") as string | null) || "OTHER";
    if (!DOCUMENT_KINDS.includes(documentKindRaw as DocumentKind)) {
      return NextResponse.json({ error: "Invalid documentKind" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadFile({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      productId,
      documentKind: documentKindRaw as DocumentKind,
      originalName: file.name,
      mimeType: file.type,
      buffer,
      ip: ipFromRequest(req),
    });

    return NextResponse.json(
      {
        file: {
          id: result.file.id,
          fileName: result.file.fileName,
          documentKind: result.file.documentKind,
          sizeBytes: result.file.sizeBytes,
          analysisStatus: result.file.analysisStatus,
          analysisSummary: result.file.analysisSummary,
          analysisJson: result.file.analysisJson,
        },
        duplicateOf: result.duplicateOf,
      },
      { status: 201 },
    );
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/files/upload]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
