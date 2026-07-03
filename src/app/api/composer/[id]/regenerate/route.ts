import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { regenerateComposerDocument } from "@/lib/composer/service";

export const runtime = "nodejs";

const schema = z.object({ instructions: z.string().max(2000).optional() });

// POST /api/composer/[id]/regenerate — re-run AI using existing context (min Consultant).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    const doc = await regenerateComposerDocument({
      companyId: ctx.companyId, userId: ctx.user.id, id: params.id,
      instructions: parsed.success ? parsed.data.instructions : undefined, ip: ipFromRequest(req),
    });
    return NextResponse.json({ document: { id: doc.id, version: doc.version, status: doc.status, contentMarkdown: doc.contentMarkdown } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer regenerate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
