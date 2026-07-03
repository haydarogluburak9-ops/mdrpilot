import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { loadDesignControl, updateDesignControlRecord } from "@/lib/products/design-control-service";
import {
  buildDesignTraceabilityMatrix,
  traceabilityMatrixMarkdown,
} from "@/lib/design-control/traceability";

export const runtime = "nodejs";

const patchSchema = z.object({
  recordId: z.string(),
  title: z.string().max(500).optional(),
  description: z.string().max(8000).optional().nullable(),
  reference: z.string().max(500).optional().nullable(),
  status: z.enum(["MISSING", "DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"]).optional(),
  ownerName: z.string().max(200).optional().nullable(),
  completedAt: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "tr";
    const data = await loadDesignControl(params.id, ctx.companyId, locale);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const traceability = buildDesignTraceabilityMatrix(data, locale);
    return NextResponse.json({
      records: data,
      traceability,
      traceabilityMarkdown: traceabilityMatrixMarkdown(traceability, locale),
    });
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
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const row = await updateDesignControlRecord(ctx.companyId, parsed.data.recordId, parsed.data);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
