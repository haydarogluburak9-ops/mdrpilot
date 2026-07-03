import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { createComposerExport } from "@/lib/composer/service";

export const runtime = "nodejs";

const schema = z.object({ format: z.enum(["docx", "pdf"]), language: z.enum(["tr", "en", "de", "fr"]).optional() });

// POST /api/composer/[id]/export — create an ExportJob (visible in Export Center),
// returns the job so the client can download via /api/exports/[id]/download.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "format must be docx or pdf" }, { status: 400 });

    const job = await createComposerExport({
      companyId: ctx.companyId, userId: ctx.user.id, id: params.id,
      format: parsed.data.format, ip: ipFromRequest(req), language: parsed.data.language,
    });

    if (job.status === "FAILED") {
      return NextResponse.json({ error: job.errorMessage ?? "Export failed", job: { id: job.id, status: job.status } }, { status: 500 });
    }

    return NextResponse.json({
      job: { id: job.id, status: job.status, fileName: job.fileName, type: job.type, format: job.format },
      downloadUrl: `/api/exports/${job.id}/download`,
    }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer export]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
