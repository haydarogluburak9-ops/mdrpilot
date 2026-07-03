import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { loadSoftwareLifecycle, saveSoftwareLifecycle } from "@/lib/products/software-lifecycle-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  safetyClass: z.enum(["A", "B", "C"]).optional().nullable(),
  developmentPlan: z.string().max(50000).optional().nullable(),
  requirementsSpec: z.string().max(50000).optional().nullable(),
  architectureDesign: z.string().max(50000).optional().nullable(),
  unitVerification: z.string().max(50000).optional().nullable(),
  integrationTesting: z.string().max(50000).optional().nullable(),
  systemTesting: z.string().max(50000).optional().nullable(),
  releaseRecord: z.string().max(50000).optional().nullable(),
  maintenancePlan: z.string().max(50000).optional().nullable(),
  status: z.enum(["MISSING", "DRAFT", "IN_REVIEW", "APPROVED"]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "tr";
    const data = await loadSoftwareLifecycle(params.id, ctx.companyId, locale);
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
    const row = await saveSoftwareLifecycle(params.id, ctx.companyId, parsed.data);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
