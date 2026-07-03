import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { generatePmcfSurvey } from "@/lib/products/pmcf-survey-service";
import { formatPmcfSurveyMarkdown } from "@/lib/domain/pmcf-survey";

export const runtime = "nodejs";

const schema = z.object({
  _locale: z.enum(["tr", "en"]).default("tr"),
});

// POST /api/products/[id]/pmcf-survey/generate
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

    const { survey, sectionId } = await generatePmcfSurvey(
      ctx.companyId,
      params.id,
      parsed.data._locale,
    );

    await writeAuditLog({
      action: "product.pmcf-survey.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "TechnicalFileSection",
      entityId: sectionId,
      metadata: { productId: params.id, source: survey.source },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      survey,
      markdown: formatPmcfSurveyMarkdown(survey),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/pmcf-survey/generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
