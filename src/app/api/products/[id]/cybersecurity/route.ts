import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { loadCyberSecurity, saveCyberSecurity } from "@/lib/products/cybersecurity-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  threatModel: z.string().max(50000).optional().nullable(),
  sbomReference: z.string().max(8000).optional().nullable(),
  vulnerabilityProcess: z.string().max(8000).optional().nullable(),
  securityTesting: z.string().max(8000).optional().nullable(),
  patchManagement: z.string().max(8000).optional().nullable(),
  clinicalSafetyImpact: z.string().max(8000).optional().nullable(),
  status: z.enum(["MISSING", "DRAFT", "IN_REVIEW", "APPROVED"]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "tr";
    const data = await loadCyberSecurity(params.id, ctx.companyId, locale);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const row = await saveCyberSecurity(params.id, ctx.companyId, parsed.data);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
