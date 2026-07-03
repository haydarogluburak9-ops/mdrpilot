import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { syncCerGapMatrix } from "@/lib/products/clinical-evaluation-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const locale = parsed.data.locale ?? "tr";
    const evaluation = await syncCerGapMatrix(ctx.companyId, params.id, locale);
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/gap-matrix/sync]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
