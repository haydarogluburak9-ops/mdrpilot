import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { ipFromRequest } from "@/lib/audit";
import { setCompanyLogo, removeCompanyLogo, LOGO_MAX_BYTES } from "@/lib/company/branding";

export const runtime = "nodejs";

// POST /api/settings/logo — upload the company logo (multipart). Quality Manager+.
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");

    if (!rateLimit(clientKey(req, "logo")).ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (file.size > LOGO_MAX_BYTES) {
      return NextResponse.json({ error: "Logo exceeds the 2 MB size limit" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await setCompanyLogo({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      buffer,
      mimeType: file.type,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ logo: result }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/settings/logo POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/settings/logo — remove the company logo. Quality Manager+.
export async function DELETE(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    await removeCompanyLogo({ companyId: ctx.companyId, userId: ctx.user.id, ip: ipFromRequest(req) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/settings/logo DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
