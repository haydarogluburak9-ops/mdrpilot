import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { suggestProductDetails } from "@/lib/products/suggest";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().max(200).default(""),
  deviceClass: z
    .enum(["CLASS_I", "CLASS_IS", "CLASS_IM", "CLASS_IR", "CLASS_IIA", "CLASS_IIB", "CLASS_III"])
    .default("CLASS_I"),
  isInvasive: z.boolean().default(false),
  hasMeasuringFn: z.boolean().default(false),
  containsSoftware: z.boolean().default(false),
  brands: z.array(z.string()).max(50).default([]),
  models: z.array(z.string()).max(100).default([]),
  sterilizations: z.array(z.string()).max(10).default([]),
  lang: z.enum(["tr", "en"]).default("tr"),
});

// POST /api/products/suggest — AI draft for descriptive fields (CONSULTANT+).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const json = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const suggestion = await suggestProductDetails(parsed.data, ctx.companyId);

    await writeAuditLog({
      action: "product.suggest",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Product",
      metadata: { source: suggestion.source, model: suggestion.model },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ suggestion });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/suggest POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
