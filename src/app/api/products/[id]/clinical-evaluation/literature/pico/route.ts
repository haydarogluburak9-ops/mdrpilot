import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { suggestPicoForProduct } from "@/lib/products/clinical-literature-pico-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
});

// POST — suggest PICO fields from product profile (no PubMed search)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const pico = await suggestPicoForProduct(ctx.companyId, params.id, parsed.data.locale ?? "tr");
    if (!pico) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ pico });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/literature/pico POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
