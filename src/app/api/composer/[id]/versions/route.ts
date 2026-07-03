import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { getComposerVersionContents } from "@/lib/composer/service";

export const runtime = "nodejs";

// GET /api/composer/[id]/versions — full version contents for diff/compare.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const versions = await getComposerVersionContents(ctx.companyId, params.id);
    return NextResponse.json({ versions });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer versions]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
