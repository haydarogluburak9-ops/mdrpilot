import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { reanalyzeFile } from "@/lib/files/upload-service";

export const runtime = "nodejs";

// POST /api/files/[id]/analyze — re-run AI analysis (min role CONSULTANT).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const file = await reanalyzeFile(ctx.companyId, params.id, ctx.user.id, ipFromRequest(req));
    return NextResponse.json({
      file: {
        id: file.id,
        analysisStatus: file.analysisStatus,
        analysisSummary: file.analysisSummary,
        analysisJson: file.analysisJson,
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/files/[id]/analyze]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
