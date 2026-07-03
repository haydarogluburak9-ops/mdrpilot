import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { linkEvidence } from "@/lib/files/evidence-service";

export const runtime = "nodejs";

const schema = z.object({
  technicalFileSectionId: z.string().min(1),
  uploadedFileId: z.string().min(1),
  note: z.string().max(500).optional(),
});

// POST /api/evidence/technical-file — link a file to a technical file section.
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const link = await linkEvidence("technical-file", {
      companyId: ctx.companyId,
      userId: ctx.user.id,
      targetId: parsed.data.technicalFileSectionId,
      uploadedFileId: parsed.data.uploadedFileId,
      note: parsed.data.note,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/evidence/technical-file POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
