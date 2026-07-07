import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { fetchLiteratureAcceptedArticleForStudy } from "@/lib/products/clinical-literature-article-sync-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  studyIndex: z.number().int().positive(),
  locale: z.enum(["tr", "en"]).optional(),
});

// POST — fetch open-access PDF for one included study (EK-4)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const locale = parsed.data.locale ?? "tr";
    const result = await fetchLiteratureAcceptedArticleForStudy(
      ctx.companyId,
      params.id,
      parsed.data.studyIndex,
      locale,
    );
    if (!result) {
      return NextResponse.json({ error: "Study not found — run search first" }, { status: 400 });
    }

    await writeAuditLog({
      action: "clinical_evaluation.literature.articles.fetch",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: result.evaluation.id,
      metadata: {
        productId: params.id,
        studyIndex: parsed.data.studyIndex,
        fetched: result.fetched,
        unavailable: result.unavailable,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/literature/articles/fetch POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
