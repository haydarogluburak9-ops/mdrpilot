import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { ipFromRequest } from "@/lib/audit";
import { uploadStandardDocument } from "@/lib/rag/standards-service";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/files/config";
import type { StandardSourceType } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED: StandardSourceType[] = ["USER_UPLOADED_LICENSED", "INTERNAL_PROCEDURE"];

// POST /api/standards/upload — multipart/form-data; create a company-owned standard (CONSULTANT+).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");

    if (!rateLimit(clientKey(req, "standard-upload")).ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_UPLOAD_MB} MB limit` }, { status: 413 });
    }

    const sourceType = (form.get("sourceType") as string | null) || "INTERNAL_PROCEDURE";
    if (!ALLOWED.includes(sourceType as StandardSourceType)) {
      return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { standard, chunks } = await uploadStandardDocument({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      code: (form.get("code") as string | null) ?? "",
      title: (form.get("title") as string | null) ?? "",
      version: (form.get("version") as string | null) ?? undefined,
      jurisdiction: (form.get("jurisdiction") as string | null) ?? undefined,
      sourceType: sourceType as StandardSourceType,
      originalName: file.name,
      mimeType: file.type,
      buffer,
      ip: ipFromRequest(req),
    });

    return NextResponse.json(
      { standard: { id: standard.id, code: standard.code, title: standard.title, sourceType: standard.sourceType }, chunks },
      { status: 201 },
    );
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/standards/upload]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
