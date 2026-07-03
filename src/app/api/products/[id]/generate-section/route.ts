import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { generateTechnicalSection } from "@/lib/products/generate-section";

export const runtime = "nodejs";

const schema = z.object({
  sectionId: z.string().min(1),
  _locale: z.enum(["tr", "en"]).default("en"),
});

// POST /api/products/[id]/generate-section — AI drafts one technical-file section (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");

    const limit = rateLimit(clientKey(req, "ai"));
    if (!limit.ok) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const result = await generateTechnicalSection(
      ctx.companyId,
      params.id,
      parsed.data.sectionId,
      parsed.data._locale,
      ctx.user.name ?? ctx.user.email,
    );
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "product.section.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "TechnicalFileSection",
      entityId: result.sectionId,
      metadata: { productId: params.id, source: result.source, model: result.model },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/generate-section]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
