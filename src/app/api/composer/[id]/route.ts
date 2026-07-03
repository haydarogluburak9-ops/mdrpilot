import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { getComposerDocumentDetail } from "@/lib/data/queries";
import { updateComposerDocument } from "@/lib/composer/service";

export const runtime = "nodejs";

// GET /api/composer/[id] — full document detail (company-scoped).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const document = await getComposerDocumentDetail(ctx.companyId, params.id);
    if (!document) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    return NextResponse.json({ document });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer/[id] GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

const patchSchema = z.object({
  title: z.string().max(200).optional(),
  contentMarkdown: z.string().optional(),
  changeSummary: z.string().max(300).optional(),
});

// PATCH /api/composer/[id] — edit content/title, creating a new version (min Consultant).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const doc = await updateComposerDocument({
      companyId: ctx.companyId, userId: ctx.user.id, id: params.id,
      title: parsed.data.title, contentMarkdown: parsed.data.contentMarkdown,
      changeSummary: parsed.data.changeSummary, ip: ipFromRequest(req),
    });
    return NextResponse.json({ document: { id: doc.id, title: doc.title, version: doc.version, status: doc.status } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer/[id] PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
