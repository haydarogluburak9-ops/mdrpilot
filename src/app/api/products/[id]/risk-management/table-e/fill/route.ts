import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { fillTableEForProduct } from "@/lib/products/risk-table-e-fill";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  overwrite: z.boolean().optional(),
  linkFmea: z.boolean().optional(),
});

// POST /api/products/[id]/risk-management/table-e/fill
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await fillTableEForProduct(params.id, ctx.companyId, {
      locale: parsed.data.locale,
      overwrite: parsed.data.overwrite,
      linkFmea: parsed.data.linkFmea,
    });

    return NextResponse.json({
      e1Rows: result.e1Rows,
      e2Rows: result.e2Rows,
      fmeaLinked: result.fmeaLinked,
      source: result.source,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/risk-management/table-e/fill]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
